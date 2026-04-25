import {
  Injectable,
  UnauthorizedException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshDto } from './dto/refresh.dto';

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export type AuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  expiresAt?: number;
  user: {
    id: string;
    email?: string;
    appMetadata: User['app_metadata'];
    userMetadata: User['user_metadata'];
  };
};

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(private readonly config: ConfigService) {}

  private supabaseProjectUrl(): string {
    const u =
      this.config.get<string>('SUPABASE_URL')?.trim() ||
      this.config.get<string>('STORAGE_SUPABASE_URL')?.trim();
    if (!u) {
      throw new BadGatewayException('Defina SUPABASE_URL ou STORAGE_SUPABASE_URL no .env');
    }
    return u;
  }

  private supabaseServiceKey(): string {
    const s =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      this.config.get<string>('STORAGE_SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!s) {
      throw new BadGatewayException(
        'Defina SUPABASE_SERVICE_ROLE_KEY ou STORAGE_SUPABASE_SERVICE_ROLE_KEY no .env',
      );
    }
    return s;
  }

  private userAuthClient(): SupabaseClient {
    const url = this.supabaseProjectUrl();
    const anon =
      this.config.get<string>('SUPABASE_ANON_KEY')?.trim() ||
      this.config.get<string>('STORAGE_SUPABASE_ANON_KEY')?.trim();
    const service =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      this.config.get<string>('STORAGE_SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const key = anon || service;
    if (!key) {
      throw new BadGatewayException(
        'Defina SUPABASE_ANON_KEY, STORAGE_SUPABASE_ANON_KEY ou a service role (SUPABASE_SERVICE_ROLE_KEY / STORAGE_SUPABASE_SERVICE_ROLE_KEY) no .env',
      );
    }
    return createClient(url, key);
  }

  private adminClient(): SupabaseClient {
    const url = this.supabaseProjectUrl();
    const service = this.supabaseServiceKey();
    return createClient(url, service);
  }

  private mapSession(session: Session | null): AuthSessionPayload {
    if (!session?.user) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const u = session.user;
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      tokenType: session.token_type,
      expiresAt: session.expires_at,
      user: {
        id: u.id,
        email: u.email ?? undefined,
        appMetadata: u.app_metadata,
        userMetadata: u.user_metadata,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthSessionPayload> {
    this.log.log(
      `${c.cyan}📧${c.reset} signInWithPassword → ${c.dim}${dto.email}${c.reset}`,
    );
    const { data, error } = await this.userAuthClient().auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error) {
      this.log.warn(`${c.yellow}⚠️${c.reset} login falhou: ${error.message}`);
      throw new UnauthorizedException(error.message);
    }
    this.log.log(`${c.green}✅${c.reset} login OK (user ${data.user?.id ?? '?'})`);
    return this.mapSession(data.session);
  }

  async google(dto: GoogleAuthDto): Promise<AuthSessionPayload> {
    this.log.log(`${c.magenta}🔑${c.reset} signInWithIdToken (google)`);
    const { data, error } = await this.userAuthClient().auth.signInWithIdToken({
      provider: 'google',
      token: dto.idToken,
    });
    if (error) {
      this.log.warn(`${c.yellow}⚠️${c.reset} Google falhou: ${error.message}`);
      throw new UnauthorizedException(error.message);
    }
    this.log.log(`${c.green}✅${c.reset} Google OK (user ${data.user?.id ?? '?'})`);
    return this.mapSession(data.session);
  }

  async refresh(dto: RefreshDto): Promise<AuthSessionPayload> {
    this.log.log(`${c.blue}🔄${c.reset} refreshSession`);
    const { data, error } = await this.userAuthClient().auth.refreshSession({
      refresh_token: dto.refreshToken,
    });
    if (error) {
      this.log.warn(`${c.yellow}⚠️${c.reset} refresh falhou: ${error.message}`);
      throw new UnauthorizedException(error.message);
    }
    this.log.log(`${c.green}✅${c.reset} refresh OK`);
    return this.mapSession(data.session);
  }

  /** Valida access JWT com a service role (uso em guards). */
  async getUserFromAccessToken(accessToken: string): Promise<User> {
    const { data, error } = await this.adminClient().auth.getUser(accessToken);
    if (error || !data.user) {
      this.log.warn(
        `${c.yellow}🛡️${c.reset} getUser falhou: ${error?.message ?? 'sem user'}`,
      );
      throw new UnauthorizedException(error?.message ?? 'Token inválido ou expirado');
    }
    return data.user;
  }
}
