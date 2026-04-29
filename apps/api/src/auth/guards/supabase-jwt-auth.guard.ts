import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { WorkspaceContext } from '../../tenancy/workspace-context';

@Injectable()
export class SupabaseJwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: unknown;
      workspace?: WorkspaceContext;
      apiKey?: { id: string; workspaceId: string };
    }>();
    const raw = req.headers?.authorization;
    if (!raw?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Cabeçalho Authorization: Bearer <access_token> em falta');
    }
    const token = raw.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token em falta');
    }

    // API key flow: tokens prefixed with "hm_" map to a workspace directly.
    if (token.startsWith('hm_')) {
      const hash = createHash('sha256').update(token).digest('hex');
      const key = await this.prisma.apiKey.findFirst({
        where: { hash, revokedAt: null },
        include: {
          workspace: { select: { id: true, organizationId: true } },
        },
      });
      if (!key || !key.workspace) {
        throw new UnauthorizedException('API key inválida');
      }
      req.user = {
        id: `api-key:${key.id}`,
        email: null,
        app_metadata: {},
        user_metadata: { name: key.name, source: 'api-key' },
      } as unknown;
      req.apiKey = { id: key.id, workspaceId: key.workspaceId };
      req.workspace = {
        workspaceId: key.workspace.id,
        organizationId: key.workspace.organizationId,
        membershipId: `api-key:${key.id}`,
        role: 'OWNER',
      };
      void this.prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
      return true;
    }

    const user = await this.auth.getUserFromAccessToken(token);
    req.user = user;
    return true;
  }
}
