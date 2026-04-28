import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InviteScope,
  MembershipRole,
  Prisma,
  ResourceRole,
  WorkspaceInviteStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { NotificationMailService } from '../mail/notification-mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

type ResourceContext = {
  scope: InviteScope;
  resource: { id: string; label: string } | null;
};

@Injectable()
export class WorkspaceInvitesService {
  private readonly log = new Logger(WorkspaceInvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: NotificationMailService,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private appUrl() {
    return process.env.APP_URL ?? 'https://app.hubmail.to';
  }

  private buildAcceptUrl(token: string) {
    return `${this.appUrl()}/invite/${token}`;
  }

  private async loadResource(workspaceId: string, dto: {
    scope: InviteScope;
    domainId?: string;
    mailboxId?: string;
    mailGroupId?: string;
    webhookId?: string;
  }): Promise<ResourceContext> {
    if (dto.scope === InviteScope.WORKSPACE) {
      return { scope: dto.scope, resource: null };
    }
    if (dto.scope === InviteScope.DOMAIN) {
      if (!dto.domainId) throw new BadRequestException('domainId é obrigatório');
      const r = await this.prisma.domain.findFirst({
        where: { id: dto.domainId, workspaceId },
        select: { id: true, name: true },
      });
      if (!r) throw new NotFoundException('Domínio não encontrado');
      return { scope: dto.scope, resource: { id: r.id, label: r.name } };
    }
    if (dto.scope === InviteScope.MAILBOX) {
      if (!dto.mailboxId) throw new BadRequestException('mailboxId é obrigatório');
      const r = await this.prisma.mailbox.findFirst({
        where: { id: dto.mailboxId, workspaceId },
        select: { id: true, address: true },
      });
      if (!r) throw new NotFoundException('Conta de email não encontrada');
      return { scope: dto.scope, resource: { id: r.id, label: r.address } };
    }
    if (dto.scope === InviteScope.MAIL_GROUP) {
      if (!dto.mailGroupId) throw new BadRequestException('mailGroupId é obrigatório');
      const r = await this.prisma.mailGroup.findFirst({
        where: { id: dto.mailGroupId, workspaceId },
        select: { id: true, name: true, address: true },
      });
      if (!r) throw new NotFoundException('Grupo não encontrado');
      return { scope: dto.scope, resource: { id: r.id, label: r.name || r.address } };
    }
    if (dto.scope === InviteScope.WEBHOOK) {
      if (!dto.webhookId) throw new BadRequestException('webhookId é obrigatório');
      const r = await this.prisma.webhook.findFirst({
        where: { id: dto.webhookId, workspaceId },
        select: { id: true, url: true, description: true },
      });
      if (!r) throw new NotFoundException('Webhook não encontrado');
      return { scope: dto.scope, resource: { id: r.id, label: r.description || r.url } };
    }
    throw new BadRequestException('Escopo inválido');
  }

  private validateRoles(scope: InviteScope, role?: MembershipRole, resourceRole?: ResourceRole) {
    if (scope === InviteScope.WORKSPACE) {
      if (!role) throw new BadRequestException('role é obrigatório quando scope=WORKSPACE');
      if (role === MembershipRole.OWNER) {
        throw new BadRequestException('Não é permitido convidar como OWNER');
      }
    } else {
      if (!resourceRole) {
        throw new BadRequestException('resourceRole é obrigatório quando scope ≠ WORKSPACE');
      }
    }
  }

  private resourceLink(scope: InviteScope, resource: { id: string; label: string } | null) {
    return resource ? { id: resource.id, label: resource.label } : null;
  }

  private inviteToSummary(
    invite: Prisma.WorkspaceInviteGetPayload<{
      include: { domain: true; mailbox: true; mailGroup: true; webhook: true };
    }>,
  ) {
    let resource: { id: string; label: string } | null = null;
    if (invite.scope === InviteScope.DOMAIN && invite.domain) {
      resource = { id: invite.domain.id, label: invite.domain.name };
    } else if (invite.scope === InviteScope.MAILBOX && invite.mailbox) {
      resource = { id: invite.mailbox.id, label: invite.mailbox.address };
    } else if (invite.scope === InviteScope.MAIL_GROUP && invite.mailGroup) {
      resource = {
        id: invite.mailGroup.id,
        label: invite.mailGroup.name || invite.mailGroup.address,
      };
    } else if (invite.scope === InviteScope.WEBHOOK && invite.webhook) {
      resource = {
        id: invite.webhook.id,
        label: invite.webhook.description || invite.webhook.url,
      };
    }
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      resourceRole: invite.resourceRole,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      scope: invite.scope,
      resource,
      acceptUrl: this.buildAcceptUrl(invite.token),
      token: invite.token,
    };
  }

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  async listForWorkspace(actorId: string, workspaceId: string) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);
    await this.expireStale();
    const items = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId, status: WorkspaceInviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { domain: true, mailbox: true, mailGroup: true, webhook: true },
    });
    return items.map((i) => this.inviteToSummary(i));
  }

  async listPendingForUser(email: string) {
    await this.expireStale();
    const normalized = email.trim().toLowerCase();
    const items = await this.prisma.workspaceInvite.findMany({
      where: { email: normalized, status: WorkspaceInviteStatus.PENDING },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        domain: true,
        mailbox: true,
        mailGroup: true,
        webhook: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => ({
      ...this.inviteToSummary(i),
      workspace: i.workspace,
    }));
  }

  async getPublicByToken(token: string) {
    await this.expireStale();
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        domain: true,
        mailbox: true,
        mailGroup: true,
        webhook: true,
      },
    });
    if (!invite) throw new NotFoundException('Convite inválido');
    const inviterEmail = await this.getEmail(invite.invitedById);
    const summary = this.inviteToSummary(invite);
    return {
      email: invite.email,
      scope: summary.scope,
      role: summary.role,
      resourceRole: summary.resourceRole,
      resource: summary.resource,
      workspace: invite.workspace,
      inviterName: inviterEmail,
      message: invite.message,
      expiresAt: invite.expiresAt,
      status: invite.status,
    };
  }

  async create(actorId: string, workspaceId: string, dto: CreateWorkspaceInviteDto) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);
    this.validateRoles(dto.scope, dto.role, dto.resourceRole);
    const ctx = await this.loadResource(workspaceId, dto);

    const email = dto.email.trim().toLowerCase();

    // Não convidar quem já é membro (apenas para escopo WORKSPACE — para outros
    // escopos faz sentido convidar um membro existente para acesso adicional).
    if (dto.scope === InviteScope.WORKSPACE) {
      const existingByEmail = await this.prisma.$queryRaw<{ count: string }[]>`
        SELECT COUNT(*)::text FROM memberships m
        JOIN auth.users au ON au.id = m.user_id
        WHERE m.workspace_id = ${workspaceId}::uuid
          AND lower(au.email) = ${email}
      `.catch(() => [{ count: '0' }]);
      if (Number(existingByEmail[0]?.count) > 0) {
        throw new ConflictException('Utilizador já é membro deste workspace');
      }
    }

    // Cancelar convite pendente anterior para mesmo email + mesmo recurso.
    await this.prisma.workspaceInvite.updateMany({
      where: {
        workspaceId,
        email,
        status: WorkspaceInviteStatus.PENDING,
        scope: dto.scope,
        domainId: dto.domainId ?? null,
        mailboxId: dto.mailboxId ?? null,
        mailGroupId: dto.mailGroupId ?? null,
        webhookId: dto.webhookId ?? null,
      },
      data: { status: WorkspaceInviteStatus.CANCELLED },
    });

    const token = randomBytes(32).toString('base64url');
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        // Sempre persistimos role (default MEMBER) para satisfazer a coluna NOT NULL.
        // É só relevante quando scope=WORKSPACE.
        role: dto.scope === InviteScope.WORKSPACE
          ? (dto.role ?? MembershipRole.MEMBER)
          : MembershipRole.MEMBER,
        resourceRole: dto.scope === InviteScope.WORKSPACE ? null : dto.resourceRole,
        message: dto.message,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: actorId,
        scope: dto.scope,
        domainId: dto.domainId,
        mailboxId: dto.mailboxId,
        mailGroupId: dto.mailGroupId,
        webhookId: dto.webhookId,
      },
      include: {
        workspace: { select: { name: true } },
        domain: true,
        mailbox: true,
        mailGroup: true,
        webhook: true,
      },
    });

    const inviterEmail = await this.getEmail(actorId);
    const acceptUrl = this.buildAcceptUrl(token);
    const roleLabel = dto.scope === InviteScope.WORKSPACE
      ? (dto.role ?? MembershipRole.MEMBER)
      : (dto.resourceRole as ResourceRole);
    await this.mail.sendWorkspaceInvite({
      to: email,
      inviterName: inviterEmail ?? actorId,
      workspaceName: invite.workspace.name,
      role: roleLabel,
      scope: dto.scope,
      resourceLabel: ctx.resource?.label ?? null,
      message: dto.message,
      acceptUrl,
    });

    this.log.log(
      `convite enviado para ${email} → ws=${workspaceId} scope=${dto.scope}`,
    );
    return this.inviteToSummary(invite);
  }

  async cancel(actorId: string, workspaceId: string, inviteId: string) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== WorkspaceInviteStatus.PENDING) {
      throw new BadRequestException('Convite não está pendente');
    }
    await this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: WorkspaceInviteStatus.CANCELLED },
    });
  }

  async resend(actorId: string, workspaceId: string, inviteId: string) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId },
      include: {
        workspace: { select: { name: true } },
        domain: true,
        mailbox: true,
        mailGroup: true,
        webhook: true,
      },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== WorkspaceInviteStatus.PENDING) {
      throw new BadRequestException('Apenas convites pendentes podem ser reenviados');
    }

    const updated = await this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      include: { domain: true, mailbox: true, mailGroup: true, webhook: true },
    });

    const inviterEmail = await this.getEmail(actorId);
    const acceptUrl = this.buildAcceptUrl(invite.token);
    const summary = this.inviteToSummary(invite);
    const roleLabel = invite.scope === InviteScope.WORKSPACE
      ? invite.role
      : (invite.resourceRole as ResourceRole);
    await this.mail.sendInviteResend({
      to: invite.email,
      inviterName: inviterEmail ?? actorId,
      workspaceName: invite.workspace.name,
      role: roleLabel,
      scope: invite.scope,
      resourceLabel: summary.resource?.label ?? null,
      message: invite.message,
      acceptUrl,
    });

    this.log.log(`convite ${inviteId} reenviado para ${invite.email}`);
    return { id: updated.id, expiresAt: updated.expiresAt };
  }

  async accept(token: string, userId: string, userEmail: string | null) {
    await this.expireStale();
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!invite || invite.status !== WorkspaceInviteStatus.PENDING) {
      throw new NotFoundException('Convite inválido ou expirado');
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: WorkspaceInviteStatus.EXPIRED },
      });
      throw new BadRequestException('Convite expirado');
    }

    // Email do user autenticado tem de coincidir com o destinatário do convite
    const normalizedUserEmail = (userEmail ?? '').trim().toLowerCase();
    const normalizedInviteEmail = invite.email.trim().toLowerCase();
    if (!normalizedUserEmail || normalizedUserEmail !== normalizedInviteEmail) {
      throw new ForbiddenException(
        `Este convite é para ${invite.email}. Inicie sessão com essa conta para o aceitar.`,
      );
    }

    // Garante que o perfil existe
    await this.prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Cria/garante membership do workspace (todos os escopos exigem membership minimal)
    const baseRole =
      invite.scope === InviteScope.WORKSPACE ? invite.role : MembershipRole.MEMBER;

    await this.prisma.$transaction(async (tx) => {
      const existingMembership = await tx.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
      });
      if (!existingMembership) {
        await tx.membership.create({
          data: { userId, workspaceId: invite.workspaceId, role: baseRole },
        });
      } else if (
        invite.scope === InviteScope.WORKSPACE &&
        existingMembership.role !== MembershipRole.OWNER &&
        existingMembership.role !== invite.role
      ) {
        // Se já é membro e o convite é workspace com role diferente, faz upgrade
        await tx.membership.update({
          where: { id: existingMembership.id },
          data: { role: invite.role },
        });
      }

      if (invite.scope === InviteScope.DOMAIN && invite.domainId && invite.resourceRole) {
        await tx.domainAccess.upsert({
          where: { userId_domainId: { userId, domainId: invite.domainId } },
          update: { role: invite.resourceRole },
          create: {
            userId,
            domainId: invite.domainId,
            workspaceId: invite.workspaceId,
            role: invite.resourceRole,
          },
        });
      }
      if (invite.scope === InviteScope.MAILBOX && invite.mailboxId && invite.resourceRole) {
        await tx.mailboxAccess.upsert({
          where: { userId_mailboxId: { userId, mailboxId: invite.mailboxId } },
          update: { role: invite.resourceRole },
          create: {
            userId,
            mailboxId: invite.mailboxId,
            workspaceId: invite.workspaceId,
            role: invite.resourceRole,
          },
        });
      }
      if (invite.scope === InviteScope.MAIL_GROUP && invite.mailGroupId && invite.resourceRole) {
        await tx.mailGroupAccess.upsert({
          where: { userId_mailGroupId: { userId, mailGroupId: invite.mailGroupId } },
          update: { role: invite.resourceRole },
          create: {
            userId,
            mailGroupId: invite.mailGroupId,
            workspaceId: invite.workspaceId,
            role: invite.resourceRole,
          },
        });
      }
      if (invite.scope === InviteScope.WEBHOOK && invite.webhookId && invite.resourceRole) {
        await tx.webhookAccess.upsert({
          where: { userId_webhookId: { userId, webhookId: invite.webhookId } },
          update: { role: invite.resourceRole },
          create: {
            userId,
            webhookId: invite.webhookId,
            workspaceId: invite.workspaceId,
            role: invite.resourceRole,
          },
        });
      }

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: WorkspaceInviteStatus.ACCEPTED },
      });
    });

    // Notifica quem convidou
    const accepterEmail = await this.getEmail(userId);
    const inviterEmail = await this.getEmail(invite.invitedById);
    if (inviterEmail) {
      await this.mail.sendInviteAccepted({
        to: inviterEmail,
        acceptedBy: accepterEmail ?? userId,
        workspaceName: invite.workspace.name,
      });
    }

    this.log.log(`convite ${invite.id} aceite por ${userId} (scope=${invite.scope})`);
    return { workspace: invite.workspace, scope: invite.scope };
  }

  private async expireStale() {
    await this.prisma.workspaceInvite.updateMany({
      where: { status: WorkspaceInviteStatus.PENDING, expiresAt: { lt: new Date() } },
      data: { status: WorkspaceInviteStatus.EXPIRED },
    });
  }

  private async requireMembership(userId: string, workspaceId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) throw new ForbiddenException('Sem acesso a este workspace');
    return m;
  }

  private async requireRole(userId: string, workspaceId: string, roles: MembershipRole[]) {
    const m = await this.requireMembership(userId, workspaceId);
    if (!roles.includes(m.role)) throw new ForbiddenException('Permissão insuficiente');
    return m;
  }

  private async getEmail(userId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
    `.catch(() => [] as { email: string }[]);
    return rows[0]?.email ?? null;
  }
}
