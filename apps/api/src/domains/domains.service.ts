import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainStatus } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';
import { JmapClient, type JmapCredentials } from '../mail/jmap.client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import type { StalwartDomainProvisionJob } from '../queue/queue.names';

const DEFAULT_MAX_DOMAINS = 1;

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
    private readonly jmap: JmapClient,
    private readonly queue: QueueService,
  ) {}

  private async getPlanLimit(workspaceId: string): Promise<number> {
    const wp = await this.prisma.workspacePlan.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    return wp?.plan.maxDomains ?? DEFAULT_MAX_DOMAINS;
  }

  private managementCreds(): JmapCredentials | null {
    const username = this.config.get<string>('STALWART_MANAGEMENT_EMAIL')?.trim();
    const password = this.config.get<string>('STALWART_MANAGEMENT_PASSWORD')?.trim();
    if (!username || !password) return null;
    return { username, password };
  }

  private mxHintHost(domainName: string): string {
    return (
      this.config.get<string>('STALWART_MX_HOST')?.trim() ||
      this.config.get<string>('STALWART_SMTP_HOST')?.trim() ||
      `mail.${domainName}`
    );
  }

  /** SPF/DKIM/DMARC sugeridos quando a zona do servidor não traz tudo (ou sem credenciais de gestão). */
  private async appendMailAuthHintsIfMissing(rows: DnsSetupRow[], domainName: string, mxHost: string) {
    const mx = mxHost.replace(/\.$/, '');
    const hasSpf = rows.some((r) => r.type === 'TXT' && r.value.toLowerCase().includes('v=spf1'));
    const hasDkim = rows.some(
      (r) =>
        r.type === 'TXT' &&
        (r.host.toLowerCase().includes('_domainkey') || r.value.toLowerCase().includes('v=dkim1')),
    );
    const hasDmarc = rows.some(
      (r) => r.type === 'TXT' && r.host.toLowerCase().includes('_dmarc'),
    );

    if (!hasSpf) {
      rows.push({
        id: 'hint-spf',
        label: 'SPF — autoriza o servidor de envio (evita 550 em destinos como Gmail)',
        type: 'TXT',
        host: '@',
        value: `v=spf1 mx a:${mx} ~all`,
        source: 'hint',
      });
    }
    const realDkimKeys = await this.stalwartGetDkimKeys(domainName);
    let dkimHintsAdded = 0;
    for (const key of realDkimKeys) {
      const host = `${key.selector}._domainkey`;
      const alreadyHasThisSelector = rows.some(
        (r) => r.type === 'TXT' && r.host.toLowerCase() === host.toLowerCase(),
      );
      if (!alreadyHasThisSelector) {
        rows.push({
          id: `hint-dkim-${key.selector}`,
          label: `DKIM (${key.algorithm.toUpperCase()}) — assinatura criptográfica`,
          type: 'TXT',
          host,
          value: `v=DKIM1; k=${key.algorithm}; p=${key.publicKey}`,
          source: 'hint',
        });
        dkimHintsAdded++;
      }
    }
    if (!hasDmarc) {
      rows.push({
        id: 'hint-dmarc',
        label: 'DMARC — política de segurança e relatórios de entrega',
        type: 'TXT',
        host: '_dmarc',
        value: `v=DMARC1; p=none; rua=mailto:postmaster@${domainName}`,
        source: 'hint',
      });
    }

    const added = (!hasSpf ? 1 : 0) + dkimHintsAdded + (!hasDmarc ? 1 : 0);
    if (added > 0) {
      this.log.log(
        `\x1b[36m📝\x1b[0m DNS mail-auth: \x1b[33m${domainName}\x1b[0m — acrescentadas \x1b[32m${added}\x1b[0m sugestões (SPF/DKIM/DMARC) em falta na lista`,
      );
    }
  }

  private isEssentialDnsRow(row: DnsSetupRow, domainName: string): boolean {
    const type = row.type.toUpperCase();
    const host = row.host.toLowerCase().replace(/\.$/, '');
    const value = row.value.toLowerCase();
    const apexHosts = new Set(['@', domainName.toLowerCase()]);

    if (type === 'TXT' && host === '_hubmail') return true;
    if (type === 'MX' && apexHosts.has(host)) return true;
    if (type === 'TXT' && value.includes('v=spf1')) return true;
    if (type === 'TXT' && (host.includes('_domainkey') || value.includes('v=dkim1'))) return true;
    if (type === 'TXT' && host.includes('_dmarc')) return true;

    return false;
  }

  private sortEssentialRows(rows: DnsSetupRow[], domainName: string): DnsSetupRow[] {
    const normalizedDomain = domainName.toLowerCase();
    const order = (row: DnsSetupRow): number => {
      const type = row.type.toUpperCase();
      const host = row.host.toLowerCase().replace(/\.$/, '');
      const value = row.value.toLowerCase();

      if (type === 'TXT' && host === '_hubmail') return 10;
      if (type === 'MX' && (host === '@' || host === normalizedDomain)) return 20;
      if (type === 'TXT' && value.includes('v=spf1')) return 30;
      if (type === 'TXT' && (host.includes('_domainkey') || value.includes('v=dkim1'))) return 40;
      if (type === 'TXT' && host.includes('_dmarc')) return 50;
      return 100;
    };

    return [...rows].sort((a, b) => order(a) - order(b) || a.host.localeCompare(b.host));
  }

  private normalizeMxValueAndPriority(rows: DnsSetupRow[]): DnsSetupRow[] {
    return rows.map((row) => {
      if (row.type.toUpperCase() !== 'MX') return row;

      const value = row.value.trim();
      const m = value.match(/^(\d+)\s+(.+)$/);
      if (!m) {
        return {
          ...row,
          value: value.replace(/\.$/, ''),
        };
      }

      const [, prioRaw, hostRaw] = m;
      const priority = Number(prioRaw);
      if (!Number.isFinite(priority)) return row;

      return {
        ...row,
        priority: row.priority ?? priority,
        value: hostRaw.trim().replace(/\.$/, ''),
      };
    });
  }

  private dedupeDnsRows(rows: DnsSetupRow[]): DnsSetupRow[] {
    const seen = new Set<string>();
    const out: DnsSetupRow[] = [];
    for (const row of rows) {
      const key = [
        row.type.toUpperCase(),
        row.host.toLowerCase().replace(/\.$/, ''),
        row.value.toLowerCase().replace(/\.$/, ''),
        row.priority ?? '',
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  private normalizeAliases(primary: string, aliases?: string[]): string[] {
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

  private unwrapStalwartText(val: unknown): string {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'value' in val) {
      const v = (val as { value?: unknown }).value;
      if (typeof v === 'string') return v;
    }
    return '';
  }

  private normalizeDnsHostForUi(hostRaw: string, domainName: string): string {
    const host = hostRaw.replace(/\.$/, '').toLowerCase();
    const domain = domainName.toLowerCase();
    if (host === domain) return '@';
    if (host.endsWith(`.${domain}`)) {
      return host.slice(0, -(domain.length + 1));
    }
    return host;
  }

  private parseZoneFileToRows(zoneText: string, domainName: string): DnsSetupRow[] {
    const lines = zoneText.split(/\r?\n/).map((l) => l.trim());
    const logicalLines: string[] = [];
    let acc = '';
    let parenBalance = 0;

    for (const line of lines) {
      if (!line) continue;
      if (!acc) acc = line;
      else acc += ` ${line}`;

      parenBalance += (line.match(/\(/g) ?? []).length;
      parenBalance -= (line.match(/\)/g) ?? []).length;

      if (parenBalance <= 0) {
        logicalLines.push(acc);
        acc = '';
        parenBalance = 0;
      }
    }
    if (acc) logicalLines.push(acc);

    const rows: DnsSetupRow[] = [];
    let i = 0;
    for (const line of logicalLines) {
      if (!line || line.startsWith(';') || line.startsWith('$')) continue;
      const m = line.match(
        /^(\S+)\s+(?:(\d+)\s+)?(?:IN\s+)?(TXT|MX|CNAME|SRV|NS|A|AAAA)\s+(.+)$/i,
      );
      if (!m) continue;
      const [, name, , type, rest] = m;
      let value = rest
        .replace(/^\(\s*/, '')
        .replace(/\s*\)$/, '')
        .replace(/"\s+"/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^"(.*)"$/, '$1')
        .trim();

      let priority: number | undefined;
      if (type.toUpperCase() === 'MX') {
        const mxMatch = value.match(/^(\d+)\s+(.+)$/);
        if (mxMatch) {
          priority = Number(mxMatch[1]);
          value = mxMatch[2].trim();
        }
      }

      rows.push({
        id: `zone-${i++}`,
        label: type.toUpperCase(),
        type: type.toUpperCase(),
        host: this.normalizeDnsHostForUi(name, domainName),
        value,
        ...(priority !== undefined ? { priority } : {}),
        source: 'stalwart',
      });
    }
    return rows;
  }

  private extractSetError(setResult: unknown): string | undefined {
    if (!setResult || typeof setResult !== 'object') return undefined;
    const o = setResult as {
      notCreated?: Record<string, { type?: string; description?: string }>;
    };
    const nc = o.notCreated;
    if (!nc) return undefined;
    const first = Object.values(nc)[0];
    return first?.description ?? first?.type ?? 'set_failed';
  }

  private async stalwartFindDomainId(
    creds: JmapCredentials,
    normalizedName: string,
  ): Promise<string | null> {
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      [
        'x:Domain/query',
        {
          filter: { text: normalizedName },
          limit: 50,
        },
        'q1',
      ],
    ]);
    const qr = responses.find((r) => r[0] === 'x:Domain/query')?.[1] as {
      ids?: string[];
    };
    const ids = qr?.ids ?? [];
    if (!ids.length) return null;

    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids }, 'g1'],
    ]);
    const list = (getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as { list?: { id?: string; name?: string }[] })
      ?.list ?? [];
    const hit = list.find((d) => (d.name ?? '').toLowerCase() === normalizedName);
    return hit?.id ?? null;
  }

  private async stalwartEnsureDomain(
    creds: JmapCredentials,
    name: string,
    aliases: string[],
  ): Promise<{ id: string | null; zoneText: string; detail?: string }> {
    const normalized = name.trim().toLowerCase();
    let id = await this.stalwartFindDomainId(creds, normalized);
    const createKey = 'hubmailProvision';

    if (!id) {
      const createPayload: Record<string, unknown> = {
        name: normalized,
        certificateManagement: { '@type': 'Manual' },
        dkimManagement: { '@type': 'Automatic' },
        dnsManagement: { '@type': 'Manual' },
        subAddressing: { '@type': 'Enabled' },
      };
      if (aliases && aliases.length > 0) {
        createPayload.aliases = aliases;
      }

      const setRes = await this.jmap.invokeStalwartManagement(creds, [
        ['x:Domain/set', { create: { [createKey]: createPayload } }, 's1'],
      ]);
      const setPayload = setRes.find((r) => r[0] === 'x:Domain/set')?.[1] as {
        created?: Record<string, string>;
        notCreated?: Record<string, { type?: string; description?: string }>;
      };
      const createdId = setPayload?.created?.[createKey];
      if (createdId) {
        id = createdId;
        this.log.log(
          `\x1b[32m✨\x1b[0m Domínio \x1b[36m${normalized}\x1b[0m criado no Stalwart (id \x1b[33m${createdId}\x1b[0m)`,
        );
      } else {
        const err = this.extractSetError(setPayload);
        this.log.warn(
          `\x1b[33m⚠️\x1b[0m Stalwart x:Domain/set não criou \x1b[36m${normalized}\x1b[0m${err ? `: ${err}` : ''}`,
        );
        id = await this.stalwartFindDomainId(creds, normalized);
        if (!id) {
          return { id: null, zoneText: '', detail: err ?? 'create_failed' };
        }
      }
    } else {
      // Se já existe, garantimos que configurações críticas estão ok (DKIM Automatic)
      try {
        await this.jmap.invokeStalwartManagement(creds, [
          [
            'x:Domain/set',
            {
              update: {
                [id]: {
                  dkimManagement: { '@type': 'Automatic' },
                  subAddressing: { '@type': 'Enabled' },
                },
              },
            },
            'u1',
          ],
        ]);
      } catch (e) {
        this.log.debug(`Falha ao atualizar configurações do domínio existente ${normalized}: ${e}`);
      }
    }

    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids: [id] }, 'g2'],
    ]);
    const domainObj = (
      getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as {
        list?: { dnsZoneFile?: unknown }[];
      }
    )?.list?.[0];
    const zoneText = this.unwrapStalwartText(domainObj?.dnsZoneFile);
    return { id, zoneText };
  }

  private async stalwartGetDkimKeys(
    domainName: string,
  ): Promise<{ publicKey: string; selector: string; algorithm: string }[]> {
    const creds = this.managementCreds();
    if (!creds) return [];

    try {
      const responses = await this.jmap.invokeStalwartManagement(creds, [
        [
          'x:DkimSignature/query',
          {
            filter: { domain: domainName.toLowerCase() },
          },
          'q-dkim',
        ],
        [
          'x:DkimSignature/get',
          {
            '#ids': { resultOf: 'q-dkim', name: 'x:DkimSignature/query', path: '/ids' },
          },
          'g-dkim',
        ],
      ]);

      const getRes = responses.find((r) => r[0] === 'x:DkimSignature/get')?.[1] as {
        list?: {
          publicKey?: string;
          selector?: string;
          '@type'?: string;
          keyId?: string;
        }[];
      };

      if (getRes?.list && getRes.list.length > 0) {
        const keys: { publicKey: string; selector: string; algorithm: string }[] = [];

        for (const sig of getRes.list) {
          if (sig.publicKey && sig.selector) {
            const type = (sig['@type'] || '').toLowerCase();
            const algorithm = type.includes('ed25519') ? 'ed25519' : 'rsa';
            keys.push({ publicKey: sig.publicKey, selector: sig.selector, algorithm });
          }
        }

        if (keys.length > 0) return keys;

        // publicKey pode estar em DkimKey separado
        const keyIds = getRes.list.map((s) => s.keyId).filter(Boolean) as string[];
        if (keyIds.length > 0) {
          const keyRes = await this.jmap.invokeStalwartManagement(creds, [
            ['x:DkimKey/get', { ids: keyIds }, 'gk'],
          ]);
          const keyPayload = keyRes.find((r) => r[0] === 'x:DkimKey/get')?.[1] as {
            list?: { id: string; publicKey: string; algorithm?: string }[];
          };
          for (const sig of getRes.list) {
            const kObj = keyPayload?.list?.find((k) => k.id === sig.keyId);
            if (kObj?.publicKey && sig.selector) {
              const type = (sig['@type'] || '').toLowerCase();
              const algorithm = type.includes('ed25519') ? 'ed25519' : kObj.algorithm || 'rsa';
              keys.push({ publicKey: kObj.publicKey, selector: sig.selector, algorithm });
            }
          }
        }

        return keys;
      }
    } catch (e) {
      this.log.warn(`Falha ao buscar DKIM keys para ${domainName}: ${e}`);
    }
    return [];
  }

  /**
   * Chamado pelo BullMQ worker: idempotente (find-or-create no Stalwart).
   * Erros recuperáveis → `throw` para retry; permanentes → `UnrecoverableError`.
   */
  async provisionStalwartForDomainJob(data: StalwartDomainProvisionJob): Promise<void> {
    const domain = await this.prisma.domain.findUnique({ where: { id: data.domainId } });
    if (!domain) {
      throw new UnrecoverableError(`Domínio ${data.domainId} não existe na base HubMail`);
    }
    const creds = this.managementCreds();
    if (!creds) {
      throw new UnrecoverableError(
        'STALWART_MANAGEMENT_EMAIL/PASSWORD ausentes — job cancelado (configure a API)',
      );
    }
    const { id, detail } = await this.stalwartEnsureDomain(
      creds,
      domain.name,
      data.aliases ?? [],
    );
    if (!id) {
      throw new Error(detail ?? 'stalwart_ensure_domain_failed');
    }
    this.log.log(
      `\x1b[32m✅\x1b[0m Worker: Stalwart alinhado a \x1b[36m${domain.name}\x1b[0m (id \x1b[33m${id}\x1b[0m)`,
    );
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

  async create(workspaceId: string, actor: string, name: string, aliases?: string[]) {
    const normalized = name.trim().toLowerCase();
    const aliasList = this.normalizeAliases(normalized, aliases);

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
      data: {
        workspaceId,
        name: normalized,
        status: DomainStatus.PENDING,
        dnsVerificationToken,
      },
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

    let stalwart: { synced: boolean; detail?: string; queued?: boolean; id?: string } = { synced: false };
    const creds = this.managementCreds();
    if (creds) {
      if (this.queue.isEnabled()) {
        try {
          await this.queue.enqueueStalwartDomainProvision({
            domainId: domain.id,
            aliases: aliasList,
          });
          stalwart = { synced: false, queued: true };
          this.log.log(`\x1b[32m🚀\x1b[0m Registro Stalwart agendado via fila para \x1b[36m${normalized}\x1b[0m`);
        } catch (e) {
          this.log.warn(
            `\x1b[33m⚠️\x1b[0m Falha ao enfileirar provisionamento para ${normalized} (Redis offline?). Tentando síncrono...`,
          );
          try {
            const { id: sid, detail } = await this.stalwartEnsureDomain(creds, normalized, aliasList);
            if (sid) {
              stalwart = { synced: true, id: sid };
            } else {
              stalwart = { synced: false, detail };
            }
          } catch (syncErr) {
            stalwart = { synced: false, detail: syncErr instanceof Error ? syncErr.message : String(syncErr) };
          }
        }
      } else {
        try {
          const { id: sid, detail } = await this.stalwartEnsureDomain(creds, normalized, aliasList);
          if (sid) {
            stalwart = { synced: true, id: sid };
          } else {
            stalwart = { synced: false, detail };
          }
        } catch (e) {
          stalwart = { synced: false, detail: e instanceof Error ? e.message : String(e) };
        }
      }
    } else {
      this.log.warn(
        '\x1b[33m📭\x1b[0m STALWART_MANAGEMENT_EMAIL/PASSWORD ausentes — domínio \x1b[36m' +
          normalized +
          '\x1b[0m ficou só na base HubMail; o painel Stalwart (/admin › Domains) só atualiza após configurar credenciais JMAP de gestão na API.',
      );
    }

    this.log.log(`Domain ${normalized} created for workspace ${workspaceId}`);
    return {
      id: domain.id,
      name: domain.name,
      status: domain.status,
      createdAt: domain.createdAt,
      stalwart,
    };
  }

  async getSetup(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
    });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    let token = domain.dnsVerificationToken;
    if (!token) {
      token = randomBytes(24).toString('base64url');
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsVerificationToken: token },
      });
    }

    const mxHost = this.mxHintHost(domain.name);
    const hubmailRow: DnsSetupRow = {
      id: 'hubmail-verify',
      label: 'HubMail (verificação)',
      type: 'TXT',
      host: '_hubmail',
      value: `hubmail-verification=${token}`,
      source: 'hubmail',
    };
    const mxRow: DnsSetupRow = {
      id: 'mx-hint',
      label: 'Receção de email (MX)',
      type: 'MX',
      host: '@',
      value: mxHost,
      priority: 10,
      source: 'hint',
    };

    const rows: DnsSetupRow[] = [hubmailRow, mxRow];
    let stalwartZoneRaw = '';
    let stalwartDetail: string | undefined;
    const creds = this.managementCreds();

    if (creds) {
      try {
        const { zoneText, detail } = await this.stalwartEnsureDomain(
          creds,
          domain.name,
          [],
        );
        if (detail && !zoneText) stalwartDetail = detail;
        stalwartZoneRaw = zoneText;
        const parsed = this.parseZoneFileToRows(zoneText, domain.name);
        for (const r of parsed) {
          if (!rows.some((x) => x.type === r.type && x.host === r.host && x.value === r.value && x.priority === r.priority)) {
            rows.push(r);
          }
        }
      } catch (e) {
        stalwartDetail = e instanceof Error ? e.message : String(e);
        this.log.warn(`\x1b[33m⚠️\x1b[0m Stalwart getSetup: ${stalwartDetail}`);
      }
    }

    await this.appendMailAuthHintsIfMissing(rows, domain.name, mxHost);

    const essentials = rows.filter((row) => this.isEssentialDnsRow(row, domain.name));
    const normalizedEssentials = this.normalizeMxValueAndPriority(essentials);
    const dedupedEssentials = this.dedupeDnsRows(normalizedEssentials);
    const orderedEssentials = this.sortEssentialRows(dedupedEssentials, domain.name);
    const hidden = rows.length - orderedEssentials.length;
    if (hidden > 0) {
      this.log.log(
        `\x1b[36m🧹\x1b[0m DNS wizard \x1b[33m${domain.name}\x1b[0m — ocultados \x1b[32m${hidden}\x1b[0m registos avançados (SRV/CNAME/autoconfig/afins)`,
      );
    }

    return {
      domain: {
        id: domain.id,
        name: domain.name,
        status: domain.status,
        dnsCheckedAt: domain.dnsCheckedAt,
      },
      stalwartManagementConfigured: Boolean(creds),
      stalwartZoneFile: stalwartZoneRaw || null,
      stalwartError: stalwartDetail,
      records: orderedEssentials,
      docsUrl: 'https://hubmail.to',
    };
  }

  async verify(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
    });
    if (!domain) throw new NotFoundException('Domínio não encontrado');

    const token = domain.dnsVerificationToken;
    const verified = await this.checkDns(domain.name, token);
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

    return {
      used: domainCount,
      limit: maxDomains,
      mailboxesUsed: mailboxCount,
      mailboxesLimit: maxInboxes,
    };
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
