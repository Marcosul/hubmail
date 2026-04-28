import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainStatus, WebhookEventType } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import type { StalwartDomainProvisionJob } from '../queue/queue.names';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { DnsHelper } from './dns.helper';
import { StalwartAdapter } from './stalwart.helper';

const DEFAULT_MAX_DOMAINS = 1;

export type DomainDeleteEvent =
  | { step: 'plan'; name: string; mailboxes: number; stalwart: boolean }
  | { step: 'mailbox'; address: string; status: 'start' | 'done' | 'error' | 'skipped'; detail?: string }
  | { step: 'dkim'; status: 'start' | 'done' | 'error'; count?: number; detail?: string }
  | { step: 'domain_server'; status: 'start' | 'done' | 'error'; detail?: string }
  | { step: 'database'; status: 'start' | 'done' }
  | { step: 'complete'; mailboxesRemoved: number; stalwartErrors: string[] };

export type DnsSetupRow = {
  id: string;
  label: string;
  type: string;
  host: string;
  value: string;
  priority?: number;
  source: 'hubmail' | 'hint' | 'stalwart';
};

@Injectable()
export class DomainsService {
  private readonly log = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailServer: StalwartAdapter,
    private readonly dns: DnsHelper,
    private readonly queue: QueueService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

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

  async create(workspaceId: string, actor: string, name: string, aliases?: string[]) {
    const normalized = name.trim().toLowerCase();
    const aliasList = normalizeAliases(normalized, aliases);

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

    const dnsVerificationToken = randomBytes(24).toString('base64url');
    const domain = await this.prisma.domain.create({
      data: { workspaceId, name: normalized, status: DomainStatus.PENDING, dnsVerificationToken },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'domain.created',
        subjectType: 'Domain',
        subjectId: domain.id,
        data: { name: normalized, aliases: aliasList },
      },
    });

    const stalwart = await this.provisionEmailServer(normalized, aliasList, domain.id);

    this.log.log(`Domain ${normalized} created for workspace ${workspaceId}`);
    return { id: domain.id, name: domain.name, status: domain.status, createdAt: domain.createdAt, stalwart };
  }

  async getSetup(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, workspaceId } });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    let token = domain.dnsVerificationToken;
    if (!token) {
      token = randomBytes(24).toString('base64url');
      await this.prisma.domain.update({ where: { id: domainId }, data: { dnsVerificationToken: token } });
    }

    const mxHost = this.mxHintHost(domain.name);
    const rows: DnsSetupRow[] = [
      {
        id: 'hubmail-verify',
        label: 'HubMail (verificação)',
        type: 'TXT',
        host: '_hubmail',
        value: `hubmail-verification=${token}`,
        source: 'hubmail',
      },
      {
        id: 'mx-hint',
        label: 'Receção de email (MX)',
        type: 'MX',
        host: '@',
        value: mxHost,
        priority: 10,
        source: 'hint',
      },
    ];

    let stalwartZoneRaw = '';
    let stalwartDetail: string | undefined;

    if (this.emailServer.isConfigured()) {
      try {
        const { zoneText, detail } = await this.emailServer.ensureDomain(domain.name, []);
        if (detail && !zoneText) stalwartDetail = detail;
        stalwartZoneRaw = zoneText;
        const parsed = this.dns.parseZoneFileToRows(zoneText, domain.name);
        for (const r of parsed) {
          if (!rows.some((x) => x.type === r.type && x.host === r.host && x.value === r.value && x.priority === r.priority)) {
            rows.push(r);
          }
        }
      } catch (e) {
        stalwartDetail = e instanceof Error ? e.message : String(e);
        this.log.warn(`\x1b[33m⚠️\x1b[0m Email server getSetup: ${stalwartDetail}`);
      }
    }

    await this.dns.appendMailAuthHintsIfMissing(rows, domain.name, mxHost);

    const essentials = rows.filter((row) => this.dns.isEssentialRow(row, domain.name));
    const normalized = this.dns.normalizeMxValueAndPriority(essentials);
    const deduped = this.dns.dedupeDnsRows(normalized);
    const ordered = this.dns.sortEssentialRows(deduped, domain.name);

    const hidden = rows.length - ordered.length;
    if (hidden > 0) {
      this.log.log(
        `\x1b[36m🧹\x1b[0m DNS wizard \x1b[33m${domain.name}\x1b[0m — ocultados \x1b[32m${hidden}\x1b[0m registos avançados`,
      );
    }

    return {
      domain: { id: domain.id, name: domain.name, status: domain.status, dnsCheckedAt: domain.dnsCheckedAt },
      stalwartManagementConfigured: this.emailServer.isConfigured(),
      stalwartZoneFile: stalwartZoneRaw || null,
      stalwartError: stalwartDetail,
      records: ordered,
      docsUrl: 'https://hubmail.to',
    };
  }

  async verify(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, workspaceId } });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    const verified = await this.checkDns(domain.name, domain.dnsVerificationToken);
    const status = verified ? DomainStatus.VERIFIED : DomainStatus.PENDING;
    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: { status, dnsCheckedAt: new Date() },
    });

    if (verified && domain.status !== DomainStatus.VERIFIED) {
      void this.webhookDispatcher
        .dispatch({
          workspaceId,
          eventType: WebhookEventType.DOMAIN_VERIFIED,
          payload: {
            domain: {
              domain_id: updated.id,
              name: updated.name,
              status: updated.status,
              created_at: updated.createdAt.toISOString(),
              updated_at: updated.updatedAt.toISOString(),
            },
          },
        })
        .catch((err) =>
          this.log.error(
            `Falha ao disparar webhook domain.verified: ${
              err instanceof Error ? err.message : 'unknown'
            }`,
          ),
        );
    }

    return { id: updated.id, name: updated.name, status: updated.status, dnsCheckedAt: updated.dnsCheckedAt };
  }

  async remove(
    workspaceId: string,
    domainId: string,
    actor: string,
    onEvent: (e: DomainDeleteEvent) => void = () => {},
  ): Promise<{ ok: boolean; mailboxesRemoved: number; stalwartErrors: string[] }> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
      include: { mailboxes: { select: { id: true, address: true, stalwartAccountId: true } } },
    });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    const stalwartConfigured = this.emailServer.isConfigured();
    const stalwartErrors: string[] = [];

    onEvent({ step: 'plan', name: domain.name, mailboxes: domain.mailboxes.length, stalwart: stalwartConfigured });

    if (stalwartConfigured) {
      for (const mb of domain.mailboxes) {
        onEvent({ step: 'mailbox', address: mb.address, status: 'start' });
        if (!mb.stalwartAccountId) {
          onEvent({ step: 'mailbox', address: mb.address, status: 'skipped' });
          continue;
        }
        const r = await this.emailServer.deleteAccount(mb.stalwartAccountId);
        if (r.ok) {
          onEvent({ step: 'mailbox', address: mb.address, status: 'done' });
        } else {
          stalwartErrors.push(`${mb.address}: ${r.detail ?? 'falha'}`);
          onEvent({ step: 'mailbox', address: mb.address, status: 'error', detail: r.detail });
        }
      }

      onEvent({ step: 'dkim', status: 'start' });
      const dkim = await this.emailServer.deleteDomainDkim(domain.name);
      if (dkim.ok) {
        onEvent({ step: 'dkim', status: 'done', count: dkim.count });
      } else {
        stalwartErrors.push(`dkim: ${dkim.detail ?? 'falha'}`);
        onEvent({ step: 'dkim', status: 'error', detail: dkim.detail });
      }

      onEvent({ step: 'domain_server', status: 'start' });
      const dom = await this.emailServer.deleteDomainRecord(domain.name);
      if (dom.ok) {
        onEvent({ step: 'domain_server', status: 'done' });
      } else {
        stalwartErrors.push(`domain: ${dom.detail ?? 'falha'}`);
        onEvent({ step: 'domain_server', status: 'error', detail: dom.detail });
      }
    }

    onEvent({ step: 'database', status: 'start' });
    await this.prisma.domain.delete({ where: { id: domainId } });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'domain.deleted',
        subjectType: 'Domain',
        subjectId: domainId,
        data: {
          name: domain.name,
          mailboxesRemoved: domain.mailboxes.length,
          stalwartErrors: stalwartErrors.length ? stalwartErrors : undefined,
        },
      },
    });
    onEvent({ step: 'database', status: 'done' });

    this.log.log(
      `\x1b[31m🗑️\x1b[0m Domínio \x1b[36m${domain.name}\x1b[0m removido (mailboxes: ${domain.mailboxes.length}` +
        (stalwartErrors.length ? `, stalwart errors: ${stalwartErrors.length}` : '') +
        `)`,
    );

    onEvent({ step: 'complete', mailboxesRemoved: domain.mailboxes.length, stalwartErrors });
    return { ok: true, mailboxesRemoved: domain.mailboxes.length, stalwartErrors };
  }

  async getPlanInfo(workspaceId: string) {
    const wp = await this.prisma.workspacePlan.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    const maxDomains = wp?.plan.maxDomains ?? DEFAULT_MAX_DOMAINS;
    const maxInboxes = wp?.plan.maxInboxes ?? 3;

    const [domainCount, mailboxCount] = await Promise.all([
      this.prisma.domain.count({ where: { workspaceId } }),
      this.prisma.mailbox.count({ where: { workspaceId } }),
    ]);

    return { used: domainCount, limit: maxDomains, mailboxesUsed: mailboxCount, mailboxesLimit: maxInboxes };
  }

  /** Chamado pelo BullMQ worker: idempotente. */
  async provisionStalwartForDomainJob(data: StalwartDomainProvisionJob): Promise<void> {
    const domain = await this.prisma.domain.findUnique({ where: { id: data.domainId } });
    if (!domain) throw new UnrecoverableError(`Domínio ${data.domainId} não existe na base HubMail`);
    if (!this.emailServer.isConfigured()) {
      throw new UnrecoverableError('Email server não configurado — job cancelado');
    }

    const { id, detail } = await this.emailServer.ensureDomain(domain.name, data.aliases ?? []);
    if (!id) throw new Error(detail ?? 'ensure_domain_failed');

    this.log.log(
      `\x1b[32m✅\x1b[0m Worker: email server alinhado a \x1b[36m${domain.name}\x1b[0m (id \x1b[33m${id}\x1b[0m)`,
    );
  }

  private async provisionEmailServer(
    normalized: string,
    aliasList: string[],
    domainId: string,
  ): Promise<{ synced: boolean; detail?: string; queued?: boolean; id?: string }> {
    if (!this.emailServer.isConfigured()) {
      this.log.warn(
        '\x1b[33m📭\x1b[0m Email server não configurado — domínio \x1b[36m' +
          normalized +
          '\x1b[0m ficou só na base HubMail.',
      );
      return { synced: false };
    }

    try {
      const { id, detail } = await this.emailServer.ensureDomain(normalized, aliasList);
      if (id) {
        this.log.log(`\x1b[32m✅\x1b[0m Stalwart provisionado sync para \x1b[36m${normalized}\x1b[0m`);
        return { synced: true, id };
      }
      this.log.warn(
        `\x1b[33m⚠️\x1b[0m ensureDomain síncrono não retornou id para ${normalized}${detail ? `: ${detail}` : ''}`,
      );
      return await this.queueAsFallback(normalized, aliasList, domainId, detail);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.log.warn(`\x1b[33m⚠️\x1b[0m ensureDomain síncrono falhou para ${normalized}: ${detail}`);
      return await this.queueAsFallback(normalized, aliasList, domainId, detail);
    }
  }

  private async queueAsFallback(
    normalized: string,
    aliasList: string[],
    domainId: string,
    detail?: string,
  ): Promise<{ synced: boolean; detail?: string; queued?: boolean }> {
    if (!this.queue.isEnabled()) return { synced: false, detail };
    try {
      await this.queue.enqueueStalwartDomainProvision({ domainId, aliases: aliasList });
      this.log.log(`\x1b[36m🚀\x1b[0m Registro agendado via fila para \x1b[36m${normalized}\x1b[0m (fallback)`);
      return { synced: false, queued: true, detail };
    } catch {
      this.log.warn(`\x1b[33m⚠️\x1b[0m Fila também indisponível para ${normalized}.`);
      return { synced: false, detail };
    }
  }

  private mxHintHost(domainName: string): string {
    return (
      this.config.get<string>('STALWART_MX_HOST')?.trim() ||
      this.config.get<string>('STALWART_SMTP_HOST')?.trim() ||
      `mail.${domainName}`
    );
  }

  private async getPlanLimit(workspaceId: string): Promise<number> {
    const wp = await this.prisma.workspacePlan.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    return wp?.plan.maxDomains ?? DEFAULT_MAX_DOMAINS;
  }

  private normalizeTxtAnswer(data: string): string {
    let s = data.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    return s.replace(/\\"/g, '"');
  }

  private async checkDns(domain: string, token: string | null): Promise<boolean> {
    if (!token) return false;
    const needle = `hubmail-verification=${token}`;
    try {
      const res = await fetch(`https://dns.google/resolve?name=_hubmail.${domain}&type=TXT`);
      if (!res.ok) return false;
      const json = (await res.json()) as { Answer?: { data: string }[] };
      return (json.Answer ?? []).some((r) => this.normalizeTxtAnswer(r.data).includes(needle));
    } catch {
      return false;
    }
  }
}

function normalizeAliases(primary: string, aliases?: string[]): string[] {
  const p = primary.trim().toLowerCase();
  const seen = new Set<string>([p]);
  const out: string[] = [];
  for (const raw of aliases ?? []) {
    const a = raw.trim().toLowerCase();
    if (!a || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}
