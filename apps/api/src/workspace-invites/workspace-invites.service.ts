import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, WorkspaceInviteStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { NotificationMailService } from '../mail/notification-mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

@Injectable()
export class WorkspaceInvitesService {
  private readonly log = new Logger(WorkspaceInvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: NotificationMailService,
  ) {}

  async listForWorkspace(actorId: string, workspaceId: string) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);
    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId, status: WorkspaceInviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async listPendingForUser(email: string) {
    await this.expireStale();
    return this.prisma.workspaceInvite.findMany({
      where: { email, status: WorkspaceInviteStatus.PENDING },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(actorId: string, workspaceId: string, dto: CreateWorkspaceInviteDto) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);

    // Não convidar quem já é membro
    const alreadyMember = await this.prisma.membership.findFirst({
      where: {
        workspaceId,
        profile: { id: actorId },
      },
    });
    // (verificação por email — perfil pode não existir ainda)
    const existingByEmail = await this.prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*)::text FROM memberships m
      JOIN auth.users au ON au.id = m.user_id
      WHERE m.workspace_id = ${workspaceId}::uuid
        AND au.email = ${dto.email}
    `.catch(() => [{ count: '0' }]);
    if (Number(existingByEmail[0]?.count) > 0) {
      throw new ConflictException('Utilizador já é membro deste workspace');
    }

    // Cancelar convite pendente anterior para o mesmo email
    await this.prisma.workspaceInvite.updateMany({
      where: { workspaceId, email: dto.email, status: WorkspaceInviteStatus.PENDING },
      data: { status: WorkspaceInviteStatus.CANCELLED },
    });

    const token = randomBytes(32).toString('base64url');
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: dto.email,
        role: dto.role,
        message: dto.message,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: actorId,
      },
      include: { workspace: { select: { name: true } } },
    });

    const inviterEmail = await this.getEmail(actorId);
    const appUrl = process.env.APP_URL ?? 'https://app.hubmail.to';
    await this.mail.sendWorkspaceInvite({
      to: dto.email,
      inviterName: inviterEmail ?? actorId,
      workspaceName: invite.workspace.name,
      role: dto.role,
      message: dto.message,
      acceptUrl: `${appUrl}/invites/${token}/accept`,
    });

    this.log.log(`convite enviado para ${dto.email} → workspace ${workspaceId}`);
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
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
      include: { workspace: { select: { name: true } } },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== WorkspaceInviteStatus.PENDING) {
      throw new BadRequestException('Apenas convites pendentes podem ser reenviados');
    }

    // Renova expiração
    const updated = await this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    });

    const inviterEmail = await this.getEmail(actorId);
    const appUrl = process.env.APP_URL ?? 'https://app.hubmail.to';
    await this.mail.sendInviteResend({
      to: invite.email,
      inviterName: inviterEmail ?? actorId,
      workspaceName: invite.workspace.name,
      role: invite.role,
      message: invite.message,
      acceptUrl: `${appUrl}/invites/${invite.token}/accept`,
    });

    this.log.log(`convite ${inviteId} reenviado para ${invite.email}`);
    return { id: updated.id, expiresAt: updated.expiresAt };
  }

  async accept(token: string, userId: string) {
    await this.expireStale();
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
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

    // Garante que o perfil existe
    await this.prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Verifica se já é membro
    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });
    if (existing) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: WorkspaceInviteStatus.ACCEPTED },
      });
      return { workspace: invite.workspace };
    }

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: { userId, workspaceId: invite.workspaceId, role: invite.role },
      }),
      this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: WorkspaceInviteStatus.ACCEPTED },
      }),
    ]);

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

    this.log.log(`convite ${invite.id} aceite por ${userId}`);
    return { workspace: invite.workspace };
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
