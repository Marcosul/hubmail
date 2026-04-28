import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

@Injectable()
export class WorkspaceMembersService {
  private readonly log = new Logger(WorkspaceMembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(actorId: string, workspaceId: string) {
    await this.requireMembership(actorId, workspaceId);

    const members = await this.prisma.membership.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    // Busca emails do Supabase auth via profile ids
    const profiles = await this.prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT au.id::text, au.email
      FROM auth.users au
      WHERE au.id = ANY(${members.map((m) => m.userId)}::uuid[])
    `.catch(() => [] as { id: string; email: string }[]);

    const emailMap = new Map(profiles.map((p) => [p.id, p.email]));

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: emailMap.get(m.userId) ?? null,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  async updateRole(
    actorId: string,
    workspaceId: string,
    membershipId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);

    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!target) throw new NotFoundException('Membro não encontrado');
    if (target.role === MembershipRole.OWNER) {
      throw new ForbiddenException('A role do OWNER não pode ser alterada');
    }
    if (dto.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Não é possível atribuir a role OWNER via API');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
    });

    this.log.log(`membership ${membershipId} → role ${dto.role}`);
    return { id: updated.id, userId: updated.userId, role: updated.role };
  }

  async remove(actorId: string, workspaceId: string, membershipId: string) {
    await this.requireRole(actorId, workspaceId, ADMIN_ROLES);

    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!target) throw new NotFoundException('Membro não encontrado');
    if (target.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Não é possível remover o OWNER do workspace');
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });
    this.log.log(`membership ${membershipId} removida de workspace ${workspaceId}`);
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
    if (!roles.includes(m.role)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return m;
  }
}
