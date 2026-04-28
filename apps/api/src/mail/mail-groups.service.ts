import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainStatus } from '@prisma/client';
import { JmapClient, type JmapCredentials } from './jmap.client';
import { PrismaService } from '../prisma/prisma.service';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

interface CreateGroupInput {
  address: string;
  name: string;
  description?: string;
  memberIds?: string[];
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
  memberIds?: string[];
}

@Injectable()
export class MailGroupsService {
  private readonly log = new Logger(MailGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jmap: JmapClient,
  ) {}

  private mgmt(): JmapCredentials {
    const username = this.config.get<string>('STALWART_MANAGEMENT_EMAIL')?.trim();
    const password = this.config.get<string>('STALWART_MANAGEMENT_PASSWORD')?.trim();
    if (!username || !password) {
      throw new BadRequestException(
        'Defina STALWART_MANAGEMENT_EMAIL/PASSWORD para gerenciar grupos.',
      );
    }
    return { username, password };
  }

  private compactPayload(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '[unserializable]';
    }
  }

  private extractSetError(setResult: unknown): string | undefined {
    if (!setResult || typeof setResult !== 'object') return undefined;
    const o = setResult as {
      notCreated?: Record<string, Record<string, unknown>>;
      notUpdated?: Record<string, Record<string, unknown>>;
      notDestroyed?: Record<string, Record<string, unknown>>;
    };
    const node = o.notCreated ?? o.notUpdated ?? o.notDestroyed;
    if (!node) return undefined;
    const first = Object.values(node)[0];
    if (!first) return undefined;
    return (
      (typeof first.description === 'string' && first.description) ||
      (typeof first.detail === 'string' && first.detail) ||
      (typeof first.type === 'string' && first.type) ||
      'set_failed'
    );
  }

  private async findDomainId(creds: JmapCredentials, domainName: string): Promise<string | null> {
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/query', { filter: { name: domainName.toLowerCase() }, limit: 50 }, 'dq'],
    ]);
    const ids = (responses.find((r) => r[0] === 'x:Domain/query')?.[1] as { ids?: string[] })?.ids ?? [];
    if (!ids.length) return null;
    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids }, 'dg'],
    ]);
    const list =
      (getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as { list?: { id?: string; name?: string }[] })
        ?.list ?? [];
    return list.find((d) => (d.name ?? '').toLowerCase() === domainName.toLowerCase())?.id ?? null;
  }

  private async resolveMemberAccountIds(
    workspaceId: string,
    memberIds: string[],
  ): Promise<{ mailboxIds: string[]; accountIds: string[] }> {
    if (memberIds.length === 0) return { mailboxIds: [], accountIds: [] };
    const mailboxes = await this.prisma.mailbox.findMany({
      where: { id: { in: memberIds }, workspaceId },
      select: { id: true, address: true, stalwartAccountId: true },
    });
    if (mailboxes.length !== memberIds.length) {
      throw new BadRequestException('Algum dos membros não pertence a este workspace.');
    }
    const missing = mailboxes.filter((m) => !m.stalwartAccountId).map((m) => m.address);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Mailbox(es) sem stalwartAccountId: ${missing.join(', ')}. Reabra a inbox para ressincronizar.`,
      );
    }
    return {
      mailboxIds: mailboxes.map((m) => m.id),
      accountIds: mailboxes.map((m) => m.stalwartAccountId!),
    };
  }

  async list(workspaceId: string) {
    const groups = await this.prisma.mailGroup.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: {
        domain: true,
        members: { include: { mailbox: { select: { id: true, address: true } } } },
      },
    });
    return groups.map((g) => ({
      id: g.id,
      address: g.address,
      name: g.name,
      description: g.description,
      domain: g.domain.name,
      members: g.members.map((m) => ({ id: m.mailbox.id, address: m.mailbox.address })),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  async getOrThrow(workspaceId: string, groupId: string) {
    const group = await this.prisma.mailGroup.findFirst({
      where: { id: groupId, workspaceId },
      include: {
        domain: true,
        members: { include: { mailbox: { select: { id: true, address: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    return group;
  }

  async getDetails(workspaceId: string, groupId: string) {
    const g = await this.getOrThrow(workspaceId, groupId);
    return {
      id: g.id,
      address: g.address,
      name: g.name,
      description: g.description,
      domain: g.domain.name,
      members: g.members.map((m) => ({ id: m.mailbox.id, address: m.mailbox.address })),
      stalwartAccountId: g.stalwartAccountId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  async create(workspaceId: string, actor: string, dto: CreateGroupInput) {
    const address = dto.address.trim().toLowerCase();
    if (!address.includes('@')) throw new BadRequestException('Endereço inválido');
    const principalName = address.split('@')[0];
    const domainName = address.split('@')[1];

    const exists = await this.prisma.mailGroup.findUnique({
      where: { workspaceId_address: { workspaceId, address } },
    });
    if (exists) throw new ConflictException('Grupo já existe neste workspace');

    const domain = await this.prisma.domain.upsert({
      where: { workspaceId_name: { workspaceId, name: domainName } },
      update: {},
      create: { workspaceId, name: domainName, status: DomainStatus.PENDING },
    });

    const creds = this.mgmt();
    const stalwartDomainId = await this.findDomainId(creds, domainName);
    if (!stalwartDomainId) {
      throw new BadRequestException(
        `Domínio ${domainName} não existe no Stalwart. Crie/sincronize o domínio antes do grupo.`,
      );
    }

    const memberIds = dto.memberIds ?? [];
    const { mailboxIds, accountIds } = await this.resolveMemberAccountIds(workspaceId, memberIds);

    const createKey = 'hubmailGroup';
    const setRes = await this.jmap.invokeStalwartManagement(creds, [
      [
        'x:Account/set',
        {
          create: {
            [createKey]: {
              '@type': 'Group',
              name: principalName,
              domainId: stalwartDomainId,
              description: dto.description?.trim() || dto.name.trim(),
              members: accountIds,
            },
          },
        },
        's-grp',
      ],
    ]);
    const payload = setRes.find((r) => r[0] === 'x:Account/set')?.[1] as {
      created?: Record<string, { id?: string } | string>;
    };
    const createdEntry = payload?.created?.[createKey];
    const stalwartAccountId =
      typeof createdEntry === 'string'
        ? createdEntry
        : (createdEntry as { id?: string } | undefined)?.id;
    const err = this.extractSetError(payload);
    if (!stalwartAccountId || err) {
      throw new BadRequestException(
        `Falha ao criar grupo no Stalwart: ${err ?? 'create_failed'} | payload=${this.compactPayload(payload)}`,
      );
    }

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mailGroup.create({
        data: {
          workspaceId,
          domainId: domain.id,
          address,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          stalwartAccountId,
        },
      });
      if (mailboxIds.length > 0) {
        await tx.mailGroupMember.createMany({
          data: mailboxIds.map((mailboxId) => ({ groupId: created.id, mailboxId })),
          skipDuplicates: true,
        });
      }
      await tx.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mail_group.created',
          subjectType: 'MailGroup',
          subjectId: created.id,
          data: { address, members: mailboxIds.length },
        },
      });
      return created;
    });

    this.log.log(
      `${c.green}👥${c.reset} grupo ${c.magenta}${address}${c.reset} criado (${mailboxIds.length} membros) por ${c.cyan}${actor}${c.reset}`,
    );
    return this.getDetails(workspaceId, group.id);
  }

  async update(workspaceId: string, groupId: string, actor: string, dto: UpdateGroupInput) {
    const group = await this.getOrThrow(workspaceId, groupId);
    const creds = this.mgmt();

    let stalwartAccountId = group.stalwartAccountId;
    if (!stalwartAccountId) {
      throw new BadRequestException(
        'Grupo sem stalwartAccountId — recrie o grupo para ressincronizar.',
      );
    }

    const stalwartUpdate: Record<string, unknown> = {};
    if (dto.name !== undefined) stalwartUpdate.description = dto.description?.trim() || dto.name.trim();
    else if (dto.description !== undefined) stalwartUpdate.description = dto.description.trim() || null;

    let resolvedMembers: { mailboxIds: string[]; accountIds: string[] } | null = null;
    if (dto.memberIds !== undefined) {
      resolvedMembers = await this.resolveMemberAccountIds(workspaceId, dto.memberIds);
      stalwartUpdate.members = resolvedMembers.accountIds;
    }

    if (Object.keys(stalwartUpdate).length > 0) {
      const setRes = await this.jmap.invokeStalwartManagement(creds, [
        ['x:Account/set', { update: { [stalwartAccountId]: stalwartUpdate } }, 'u-grp'],
      ]);
      const payload = setRes.find((r) => r[0] === 'x:Account/set')?.[1];
      const err = this.extractSetError(payload);
      if (err) {
        throw new BadRequestException(
          `Stalwart rejeitou update do grupo: ${err} | payload=${this.compactPayload(payload)}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.description !== undefined) data.description = dto.description.trim() || null;
      if (Object.keys(data).length > 0) {
        await tx.mailGroup.update({ where: { id: group.id }, data });
      }
      if (resolvedMembers) {
        await tx.mailGroupMember.deleteMany({ where: { groupId: group.id } });
        if (resolvedMembers.mailboxIds.length > 0) {
          await tx.mailGroupMember.createMany({
            data: resolvedMembers.mailboxIds.map((mailboxId) => ({ groupId: group.id, mailboxId })),
            skipDuplicates: true,
          });
        }
      }
      await tx.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mail_group.updated',
          subjectType: 'MailGroup',
          subjectId: group.id,
          data: {
            fields: Object.keys(data),
            members: resolvedMembers ? resolvedMembers.mailboxIds.length : undefined,
          },
        },
      });
    });

    this.log.log(`${c.cyan}✏️${c.reset} grupo ${c.magenta}${group.address}${c.reset} atualizado`);
    return this.getDetails(workspaceId, group.id);
  }

  async remove(workspaceId: string, groupId: string, actor: string) {
    const group = await this.getOrThrow(workspaceId, groupId);
    const creds = this.mgmt();

    if (group.stalwartAccountId) {
      try {
        const res = await this.jmap.invokeStalwartManagement(creds, [
          ['x:Account/set', { destroy: [group.stalwartAccountId] }, 'd-grp'],
        ]);
        const payload = res.find((r) => r[0] === 'x:Account/set')?.[1] as {
          destroyed?: string[];
          notDestroyed?: Record<string, { description?: string; type?: string }>;
        };
        if (!payload?.destroyed?.includes(group.stalwartAccountId)) {
          const err = this.extractSetError(payload);
          this.log.warn(
            `${c.yellow}⚠️${c.reset} Stalwart não removeu grupo ${group.address}: ${err ?? 'unknown'}`,
          );
        }
      } catch (e) {
        this.log.warn(
          `${c.yellow}⚠️${c.reset} erro ao remover grupo ${group.address} no Stalwart: ${e}`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.mailGroupMember.deleteMany({ where: { groupId: group.id } }),
      this.prisma.mailGroup.delete({ where: { id: group.id } }),
      this.prisma.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mail_group.deleted',
          subjectType: 'MailGroup',
          subjectId: group.id,
          data: { address: group.address },
        },
      }),
    ]);
    this.log.log(`${c.red}🗑️${c.reset} grupo ${c.magenta}${group.address}${c.reset} removido`);
    return { ok: true };
  }
}
