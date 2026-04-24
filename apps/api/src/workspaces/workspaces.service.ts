import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import type { User } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

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

  constructor(private readonly prisma: PrismaService) {}

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
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        workspace: {
          include: { organization: true },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      organization: {
        id: m.workspace.organization.id,
        name: m.workspace.organization.name,
        slug: m.workspace.organization.slug,
      },
      createdAt: m.workspace.createdAt,
    }));
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

    return {
      id: created.workspace.id,
      name: created.workspace.name,
      slug: created.workspace.slug,
      role: MembershipRole.OWNER,
      organization: {
        id: created.organization.id,
        name: created.organization.name,
        slug: created.organization.slug,
      },
      createdAt: created.workspace.createdAt,
    };
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
      return {
        id: existing.workspace.id,
        name: existing.workspace.name,
        slug: existing.workspace.slug,
        role: existing.role,
        organization: {
          id: existing.workspace.organization.id,
          name: existing.workspace.organization.name,
          slug: existing.workspace.organization.slug,
        },
        createdAt: existing.workspace.createdAt,
      };
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
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      organization: {
        id: membership.workspace.organization.id,
        name: membership.workspace.organization.name,
        slug: membership.workspace.organization.slug,
      },
      createdAt: membership.workspace.createdAt,
    };
  }
}
