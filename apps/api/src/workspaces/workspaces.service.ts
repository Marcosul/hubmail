import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import type { User } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceTenantService } from '../domains/workspace-tenant.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `ws-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable()
export class WorkspacesService {
  private readonly log = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: WorkspaceTenantService,
  ) {}

  private async ensureProfile(userId: string): Promise<void> {
    await this.prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });
  }

  async listForUser(user: User) {
    await this.ensureProfile(user.id);
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, workspace: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      include: {
        workspace: {
          include: { organization: true },
        },
      },
    });

    return memberships.map((m) => this.toSummary(m.workspace, m.role, m.workspace.organization));
  }

  async create(user: User, dto: CreateWorkspaceDto) {
    await this.ensureProfile(user.id);
    const workspaceSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const orgName = dto.organizationName?.trim() || `${dto.name} Org`;
    const orgSlugBase = slugify(orgName);

    const created = await this.prisma.$transaction(async (tx) => {
      let orgSlug = orgSlugBase;
      let suffix = 0;
      while (await tx.organization.findUnique({ where: { slug: orgSlug } })) {
        suffix += 1;
        orgSlug = `${orgSlugBase}-${suffix}`;
      }

      const organization = await tx.organization.create({
        data: { name: orgName, slug: orgSlug },
      });

      const exists = await tx.workspace.findUnique({
        where: {
          organizationId_slug: { organizationId: organization.id, slug: workspaceSlug },
        },
      });
      if (exists) {
        throw new ConflictException('Workspace slug já existe nesta organização');
      }

      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug: workspaceSlug,
          organizationId: organization.id,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: MembershipRole.OWNER,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actor: user.id,
          action: 'workspace.created',
          subjectType: 'Workspace',
          subjectId: workspace.id,
          data: { name: dto.name, slug: workspaceSlug, organization: orgSlug },
        },
      });

      return { workspace, organization };
    });

    this.log.log(
      `${c.green}🏗️${c.reset}  workspace ${c.magenta}${created.workspace.slug}${c.reset} criado por ${c.cyan}${user.email ?? user.id}${c.reset}`,
    );

    // Cria tenant correspondente no Stalwart (best-effort; backfill lazy cobre falhas).
    try {
      await this.tenant.ensureForWorkspace(created.workspace.id);
    } catch (e) {
      this.log.warn(`Falha ao provisionar tenant no Stalwart para workspace ${created.workspace.slug}: ${e}`);
    }

    return this.toSummary(created.workspace, MembershipRole.OWNER, created.organization);
  }

  async bootstrapDefault(user: User) {
    const existing = await this.prisma.membership.findFirst({
      where: { userId: user.id },
      include: { workspace: { include: { organization: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      this.log.debug(
        `${c.yellow}♻️${c.reset}  user ${user.id} já tem workspace ${existing.workspace.slug}`,
      );
      return this.toSummary(existing.workspace, existing.role, existing.workspace.organization);
    }

    const fallback = user.email?.split('@')[0] ?? 'Personal';
    return this.create(user, {
      name: `${fallback} Workspace`,
      organizationName: `${fallback} Org`,
    });
  }

  async getBySlug(user: User, slug: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, workspace: { slug } },
      include: { workspace: { include: { organization: true } } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace não encontrado');
    }
    return this.toSummary(membership.workspace, membership.role, membership.workspace.organization);
  }

  async getById(user: User, id: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: id, workspace: { deletedAt: null } },
      include: { workspace: { include: { organization: true } } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace não encontrado');
    }
    return this.toSummary(membership.workspace, membership.role, membership.workspace.organization);
  }

  async update(user: User, id: string, dto: UpdateWorkspaceDto) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: id, workspace: { deletedAt: null } },
      include: { workspace: { include: { organization: true } } },
    });
    if (!membership) throw new NotFoundException('Workspace não encontrado');
    if (!([MembershipRole.OWNER, MembershipRole.ADMIN] as MembershipRole[]).includes(membership.role)) {
      throw new ForbiddenException('Apenas OWNER ou ADMIN podem renomear o workspace');
    }

    const updated = await this.prisma.workspace.update({
      where: { id },
      data: { name: dto.name },
      include: { organization: true },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId: id,
        actor: user.id,
        action: 'workspace.updated',
        subjectType: 'Workspace',
        subjectId: id,
        data: { name: dto.name },
      },
    });

    this.log.log(
      `${c.cyan}✏️${c.reset}  workspace ${c.magenta}${updated.slug}${c.reset} renomeado para "${dto.name}"`,
    );
    return this.toSummary(updated, membership.role, updated.organization);
  }

  async countResources(user: User, id: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: id, workspace: { deletedAt: null } },
    });
    if (!membership) throw new NotFoundException('Workspace não encontrado');

    const [domains, mailboxes, webhooks] = await Promise.all([
      this.prisma.domain.count({ where: { workspaceId: id } }),
      this.prisma.mailbox.count({ where: { workspaceId: id } }),
      this.prisma.webhook.count({ where: { workspaceId: id } }),
    ]);

    return { domains, mailboxes, webhooks };
  }

  async remove(user: User, id: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: id, workspace: { deletedAt: null } },
      include: { workspace: true },
    });
    if (!membership) throw new NotFoundException('Workspace não encontrado');
    if (membership.role !== MembershipRole.OWNER) {
      throw new ForbiddenException('Apenas o OWNER pode apagar o workspace');
    }

    const workspace = membership.workspace;

    // Deletar recursos em cascata em transação
    await this.prisma.$transaction(async (tx) => {
      // Deletar Stalwart tenant se existir
      if (workspace.stalwartTenantId) {
        try {
          // TODO: Implementar chamada para deletar tenant no Stalwart
          // await this.stalwart.deleteTenant(workspace.stalwartTenantId);
          this.log.log(
            `${c.cyan}🔗${c.reset}  tenant Stalwart ${workspace.stalwartTenantId} seria deletado (TODO)`,
          );
        } catch (e) {
          this.log.warn(`Falha ao deletar tenant Stalwart: ${e}`);
        }
      }

      // Deletar em cascata (Prisma faz cascata automática)
      await tx.webhook.deleteMany({ where: { workspaceId: id } });
      await tx.mailbox.deleteMany({ where: { workspaceId: id } });
      await tx.domain.deleteMany({ where: { workspaceId: id } });
      await tx.automation.deleteMany({ where: { workspaceId: id } });
      await tx.agent.deleteMany({ where: { workspaceId: id } });
      await tx.apiKey.deleteMany({ where: { workspaceId: id } });
      await tx.outgoingMessage.deleteMany({ where: { workspaceId: id } });
      await tx.inboxEvent.deleteMany({ where: { workspaceId: id } });

      // Hard delete do workspace
      await tx.workspace.delete({ where: { id } });

      // Registro de auditoria
      await tx.auditLog.create({
        data: {
          workspaceId: id,
          actor: user.id,
          action: 'workspace.hard_deleted',
          subjectType: 'Workspace',
          subjectId: id,
          data: { workspaceName: workspace.name, workspaceSlug: workspace.slug },
        },
      });
    });

    this.log.log(
      `${c.yellow}🗑️${c.reset}  workspace ${c.magenta}${workspace.slug}${c.reset} apagado permanentemente`,
    );
  }

  private toSummary(
    workspace: { id: string; name: string; slug: string; createdAt: Date },
    role: MembershipRole,
    organization: { id: string; name: string; slug: string },
  ) {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      createdAt: workspace.createdAt,
    };
  }
}
