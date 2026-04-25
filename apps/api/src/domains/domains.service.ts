import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DomainStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_MAX_DOMAINS = 1;

@Injectable()
export class DomainsService {
  private readonly log = new Logger(DomainsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getPlanLimit(workspaceId: string): Promise<number> {
    const wp = await this.prisma.workspacePlan.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    return wp?.plan.maxDomains ?? DEFAULT_MAX_DOMAINS;
  }

  async list(workspaceId: string) {
    const domains = await this.prisma.domain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { mailboxes: true } } },
    });
    return domains.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      dnsCheckedAt: d.dnsCheckedAt,
      mailboxCount: d._count.mailboxes,
      createdAt: d.createdAt,
    }));
  }

  async create(workspaceId: string, actor: string, name: string) {
    const normalized = name.trim().toLowerCase();

    const [existing, count, maxDomains] = await Promise.all([
      this.prisma.domain.findUnique({
        where: { workspaceId_name: { workspaceId, name: normalized } },
      }),
      this.prisma.domain.count({ where: { workspaceId } }),
      this.getPlanLimit(workspaceId),
    ]);

    if (existing) throw new ConflictException('Domínio já existe neste workspace');
    if (count >= maxDomains) {
      throw new BadRequestException(
        `Limite de ${maxDomains} domínio(s) atingido. Faça upgrade para adicionar mais.`,
      );
    }

    const domain = await this.prisma.domain.create({
      data: { workspaceId, name: normalized, status: DomainStatus.PENDING },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'domain.created',
        subjectType: 'Domain',
        subjectId: domain.id,
        data: { name: normalized },
      },
    });

    this.log.log(`Domain ${normalized} created for workspace ${workspaceId}`);
    return { id: domain.id, name: domain.name, status: domain.status, createdAt: domain.createdAt };
  }

  async verify(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
    });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    // Simplified DNS check — in production call a real DNS resolver
    const verified = await this.checkDns(domain.name);
    const status = verified ? DomainStatus.VERIFIED : DomainStatus.PENDING;

    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: { status, dnsCheckedAt: new Date() },
    });

    return { id: updated.id, name: updated.name, status: updated.status, dnsCheckedAt: updated.dnsCheckedAt };
  }

  async remove(workspaceId: string, domainId: string, actor: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
      include: { _count: { select: { mailboxes: true } } },
    });
    if (!domain) throw new NotFoundException('Domínio não encontrado');
    if (domain._count.mailboxes > 0) {
      throw new BadRequestException(
        'Remova todas as mailboxes deste domínio antes de excluí-lo',
      );
    }

    await this.prisma.domain.delete({ where: { id: domainId } });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'domain.deleted',
        subjectType: 'Domain',
        subjectId: domainId,
        data: { name: domain.name },
      },
    });

    return { ok: true };
  }

  async getPlanInfo(workspaceId: string) {
    const [count, limit] = await Promise.all([
      this.prisma.domain.count({ where: { workspaceId } }),
      this.getPlanLimit(workspaceId),
    ]);
    return { used: count, limit };
  }

  private async checkDns(domain: string): Promise<boolean> {
    try {
      const res = await fetch(`https://dns.google/resolve?name=_hubmail.${domain}&type=TXT`);
      if (!res.ok) return false;
      const json = (await res.json()) as { Answer?: { data: string }[] };
      return (json.Answer ?? []).some((r) => r.data.includes('hubmail-verification='));
    } catch {
      return false;
    }
  }
}
