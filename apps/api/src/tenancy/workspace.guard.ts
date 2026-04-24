import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import type { WorkspaceContext } from './workspace-context';

const c = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Resolves the current workspace from the `X-Workspace-Id` header (or query
 * string fallback) and ensures the requesting Supabase user has a membership.
 * Attaches a {@link WorkspaceContext} to `req.workspace`.
 *
 * Must run *after* `SupabaseJwtAuthGuard` so that `req.user` is populated.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  private readonly log = new Logger(WorkspaceGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
      user?: User;
      workspace?: WorkspaceContext;
    }>();

    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Autenticação obrigatória antes de resolver workspace');
    }

    const rawHeader =
      req.headers?.['x-workspace-id'] ??
      req.headers?.['X-Workspace-Id' as keyof typeof req.headers];
    const rawQuery = typeof req.query?.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const workspaceId = (headerValue ?? rawQuery)?.toString().trim();

    if (!workspaceId) {
      this.log.warn(`${c.yellow}🚧${c.reset} pedido sem X-Workspace-Id (user ${user.id})`);
      throw new ForbiddenException('Cabeçalho X-Workspace-Id é obrigatório');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      include: { workspace: { select: { id: true, organizationId: true } } },
    });

    if (!membership) {
      this.log.warn(
        `${c.yellow}🛑${c.reset} user ${user.id} sem acesso a workspace ${workspaceId}`,
      );
      throw new ForbiddenException('Sem permissões para este workspace');
    }

    const ctx: WorkspaceContext = {
      workspaceId: membership.workspace.id,
      organizationId: membership.workspace.organizationId,
      membershipId: membership.id,
      role: membership.role,
    };
    req.workspace = ctx;

    this.log.debug(
      `${c.cyan}🏷️${c.reset}  workspace ctx: ${c.magenta}${ctx.workspaceId}${c.reset} role=${ctx.role}`,
    );
    return true;
  }
}
