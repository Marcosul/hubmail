import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SupabaseJwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string }; user?: unknown }>();
    const raw = req.headers?.authorization;
    if (!raw?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Cabeçalho Authorization: Bearer <access_token> em falta');
    }
    const token = raw.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token em falta');
    }
    const user = await this.auth.getUserFromAccessToken(token);
    req.user = user;
    return true;
  }
}
