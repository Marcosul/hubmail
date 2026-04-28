import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, ResourceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

export type ResourceKind = 'domain' | 'mailbox' | 'mail-group' | 'webhook';

@Injectable()
export class ResourceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadResourceWorkspace(kind: ResourceKind, resourceId: string): Promise<string> {
    if (kind === 'domain') {
      const r = await this.prisma.domain.findUnique({
        where: { id: resourceId },
        select: { workspaceId: true },
      });
      if (!r) throw new NotFoundException('Domínio não encontrado');
      return r.workspaceId;
    }
    if (kind === 'mailbox') {
      const r = await this.prisma.mailbox.findUnique({
        where: { id: resourceId },
        select: { workspaceId: true },
      });
      if (!r) throw new NotFoundException('Conta não encontrada');
      return r.workspaceId;
    }
    if (kind === 'mail-group') {
      const r = await this.prisma.mailGroup.findUnique({
        where: { id: resourceId },
        select: { workspaceId: true },
      });
      if (!r) throw new NotFoundException('Grupo não encontrado');
      return r.workspaceId;
    }
    const r = await this.prisma.webhook.findUnique({
      where: { id: resourceId },
      select: { workspaceId: true },
    });
    if (!r) throw new NotFoundException('Webhook não encontrado');
    return r.workspaceId;
  }

  private async requireAdmin(userId: string, workspaceId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) throw new ForbiddenException('Sem acesso a este workspace');
    if (!ADMIN_ROLES.includes(m.role)) throw new ForbiddenException('Permissão insuficiente');
  }

  async list(actorId: string, kind: ResourceKind, resourceId: string) {
    const workspaceId = await this.loadResourceWorkspace(kind, resourceId);
    await this.requireAdmin(actorId, workspaceId);

    const rows = await this.fetchAccess(kind, resourceId);
    if (rows.length === 0) return [];
    const userIds = rows.map((r) => r.userId);
    const emails = await this.getEmails(userIds);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: emails[r.userId] ?? null,
      role: r.role,
      createdAt: r.createdAt,
    }));
  }

  async update(
    actorId: string,
    kind: ResourceKind,
    resourceId: string,
    accessId: string,
    role: ResourceRole,
  ) {
    const workspaceId = await this.loadResourceWorkspace(kind, resourceId);
    await this.requireAdmin(actorId, workspaceId);
    return this.updateAccess(kind, accessId, role);
  }

  async remove(actorId: string, kind: ResourceKind, resourceId: string, accessId: string) {
    const workspaceId = await this.loadResourceWorkspace(kind, resourceId);
    await this.requireAdmin(actorId, workspaceId);
    await this.deleteAccess(kind, accessId);
  }

  private async fetchAccess(kind: ResourceKind, resourceId: string) {
    if (kind === 'domain') {
      return this.prisma.domainAccess.findMany({
        where: { domainId: resourceId },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (kind === 'mailbox') {
      return this.prisma.mailboxAccess.findMany({
        where: { mailboxId: resourceId },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (kind === 'mail-group') {
      return this.prisma.mailGroupAccess.findMany({
        where: { mailGroupId: resourceId },
        orderBy: { createdAt: 'asc' },
      });
    }
    return this.prisma.webhookAccess.findMany({
      where: { webhookId: resourceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async updateAccess(kind: ResourceKind, accessId: string, role: ResourceRole) {
    if (kind === 'domain')
      return this.prisma.domainAccess.update({ where: { id: accessId }, data: { role } });
    if (kind === 'mailbox')
      return this.prisma.mailboxAccess.update({ where: { id: accessId }, data: { role } });
    if (kind === 'mail-group')
      return this.prisma.mailGroupAccess.update({ where: { id: accessId }, data: { role } });
    return this.prisma.webhookAccess.update({ where: { id: accessId }, data: { role } });
  }

  private async deleteAccess(kind: ResourceKind, accessId: string) {
    if (kind === 'domain')
      return this.prisma.domainAccess.delete({ where: { id: accessId } });
    if (kind === 'mailbox')
      return this.prisma.mailboxAccess.delete({ where: { id: accessId } });
    if (kind === 'mail-group')
      return this.prisma.mailGroupAccess.delete({ where: { id: accessId } });
    return this.prisma.webhookAccess.delete({ where: { id: accessId } });
  }

  private async getEmails(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};
    const rows = await this.prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT id::text as id, email FROM auth.users WHERE id = ANY(${userIds}::uuid[])
    `.catch(() => [] as { id: string; email: string }[]);
    const out: Record<string, string> = {};
    for (const r of rows) out[r.id] = r.email;
    return out;
  }
}
