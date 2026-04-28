import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainStatus, MailCredentialKind } from '@prisma/client';
import { JmapClient, type JmapCredentials } from './jmap.client';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

export interface CreateMailboxDto {
  address: string;
  displayName?: string;
  password?: string;
  username?: string;
}

@Injectable()
export class MailboxesService {
  private readonly log = new Logger(MailboxesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly jmap: JmapClient,
  ) {}

  private managementCreds(): JmapCredentials | null {
    const username = this.config.get<string>('STALWART_MANAGEMENT_EMAIL')?.trim();
    const password = this.config.get<string>('STALWART_MANAGEMENT_PASSWORD')?.trim();
    if (!username || !password) return null;
    return { username, password };
  }

  private extractSetError(setResult: unknown): string | undefined {
    if (!setResult || typeof setResult !== 'object') return undefined;
    const o = setResult as {
      notCreated?: Record<string, Record<string, unknown>>;
      notUpdated?: Record<string, Record<string, unknown>>;
    };
    const nc = o.notCreated ? Object.values(o.notCreated)[0] : undefined;
    const nu = o.notUpdated ? Object.values(o.notUpdated)[0] : undefined;
    const ncMsg =
      (typeof nc?.description === 'string' && nc.description) ||
      (typeof nc?.detail === 'string' && nc.detail) ||
      (typeof nc?.title === 'string' && nc.title) ||
      (typeof nc?.type === 'string' && nc.type) ||
      undefined;
    const nuMsg =
      (typeof nu?.description === 'string' && nu.description) ||
      (typeof nu?.detail === 'string' && nu.detail) ||
      (typeof nu?.title === 'string' && nu.title) ||
      (typeof nu?.type === 'string' && nu.type) ||
      undefined;
    return ncMsg ?? nuMsg ?? undefined;
  }

  private extractCreatedId(payload: unknown, createKey: string): string | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const created = (payload as { created?: Record<string, unknown> }).created;
    const entry = created?.[createKey];
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') {
      const id = (entry as { id?: unknown }).id;
      if (typeof id === 'string') return id;
    }
    return undefined;
  }

  private compactPayload(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '[unserializable]';
    }
  }

  private async stalwartFindDomainId(creds: JmapCredentials, domainName: string): Promise<string | null> {
    const normalized = domainName.toLowerCase();
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/query', { filter: { name: normalized }, limit: 50 }, 'dq1'],
    ]);
    const qr = responses.find((r) => r[0] === 'x:Domain/query')?.[1] as { ids?: string[] };
    const ids = qr?.ids ?? [];
    if (!ids.length) return null;

    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids }, 'dg1'],
    ]);
    const list =
      (getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as {
        list?: { id?: string; name?: string }[];
      })?.list ?? [];
    const hit = list.find((d) => (d.name ?? '').toLowerCase() === normalized);
    return hit?.id ?? null;
  }

  private async stalwartFindAccountByEmail(
    creds: JmapCredentials,
    emailAddress: string,
  ): Promise<{ id: string; name?: string; emailAddress?: string } | null> {
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      [
        'x:Account/get',
        {
          ids: null,
        },
        'q1',
      ],
    ]);
    const list = (responses.find((r) => r[2] === 'q1')?.[1] as {
      list?: Array<{ id?: string; name?: string; emailAddress?: string }>;
    })?.list ?? [];
    const target = emailAddress.toLowerCase();
    const exact = list.find((a) => (a.emailAddress ?? '').toLowerCase() === target);
    if (!exact?.id) return null;
    return { id: exact.id, name: exact.name, emailAddress: exact.emailAddress };
  }

  private async ensureStalwartMailboxSecret(
    creds: JmapCredentials,
    emailAddress: string,
    principalName: string,
    displayName?: string,
  ): Promise<string> {
    const [, domainName = ''] = emailAddress.split('@');
    const domainId = await this.stalwartFindDomainId(creds, domainName);
    if (!domainId) {
      throw new BadRequestException(
        `Domínio ${domainName} não encontrado no Stalwart. Crie/sincronize o domínio antes da inbox.`,
      );
    }

    let accountId = (await this.stalwartFindAccountByEmail(creds, emailAddress))?.id;
    if (!accountId) {
      const createKey = 'hubmailMailbox';
      const setRes = await this.jmap.invokeStalwartManagement(creds, [
        [
          'x:Account/set',
          {
            create: {
              [createKey]: {
                '@type': 'User',
                name: principalName,
                domainId,
                description: displayName?.trim() || undefined,
              },
            },
          },
          's1',
        ],
      ]);
      const payload = setRes.find((r) => r[0] === 'x:Account/set')?.[1];
      accountId = this.extractCreatedId(payload, createKey);
      const err = this.extractSetError(payload);
      if (!accountId || err) {
        throw new BadRequestException(
          `Falha ao criar conta no Stalwart: ${err ?? 'create_failed'} | payload=${this.compactPayload(payload)}`,
        );
      }
      this.log.log(
        `${c.green}✨${c.reset} conta criada no Stalwart para ${c.magenta}${emailAddress}${c.reset} (id ${accountId})`,
      );
    } else {
      this.log.log(
        `${c.cyan}♻️${c.reset} conta já existente no Stalwart para ${c.magenta}${emailAddress}${c.reset} (id ${accountId})`,
      );
    }

    const appPwdKey = 'hubmailAppPassword';
    const pwdRes = await this.jmap.invokeStalwartManagement(creds, [
      [
        'x:AppPassword/set',
        {
          accountId,
          create: {
            [appPwdKey]: {
              description: `HubMail ${emailAddress}`,
            },
          },
        },
        'p1',
      ],
    ]);
    const pwdPayload = pwdRes.find((r) => r[0] === 'x:AppPassword/set')?.[1] as {
      created?: Record<string, { id?: string; secret?: string }>;
    };
    const created = pwdPayload?.created?.[appPwdKey];
    const generatedSecret = created?.secret;
    const pwdErr = this.extractSetError(pwdPayload);
    if (!generatedSecret || pwdErr) {
      throw new BadRequestException(
        `Falha ao gerar app password no Stalwart: ${pwdErr ?? 'create_failed'} | payload=${this.compactPayload(pwdPayload)}`,
      );
    }
    this.log.log(
      `${c.green}🔐${c.reset} app password criada no Stalwart para ${c.magenta}${emailAddress}${c.reset}`,
    );
    return generatedSecret;
  }

  async list(workspaceId: string) {
    const mailboxes = await this.prisma.mailbox.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { domain: true, credential: true },
    });
    return mailboxes.map((mb) => ({
      id: mb.id,
      address: mb.address,
      displayName: mb.displayName,
      domain: mb.domain.name,
      createdAt: mb.createdAt,
      hasCredential: Boolean(mb.credentialId),
    }));
  }

  async getOrThrow(workspaceId: string, mailboxId: string) {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: mailboxId, workspaceId },
      include: { domain: true, credential: true },
    });
    if (!mailbox) {
      throw new NotFoundException('Mailbox não encontrada');
    }
    return mailbox;
  }

  async resolveCredentials(workspaceId: string, mailboxId: string) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    if (!mailbox.credential) {
      const repaired = await this.repairMissingCredential(workspaceId, mailbox);
      if (!repaired) {
        throw new BadRequestException('Mailbox sem credenciais; configure em settings');
      }
      return repaired;
    }
    const password = this.crypto.decrypt(mailbox.credential.secretRef);
    const storedUsername = mailbox.credential.username?.trim() || '';
    const normalizedUsername = storedUsername.includes('@') ? storedUsername : mailbox.address;
    if (normalizedUsername !== storedUsername) {
      this.log.warn(
        `${c.yellow}🧭${c.reset} username de credencial ajustado para email completo em runtime: ` +
          `${c.magenta}${storedUsername || '(vazio)'}${c.reset} → ${c.magenta}${normalizedUsername}${c.reset}`,
      );
    }
    return {
      mailbox,
      credentials: {
        username: normalizedUsername,
        password,
      },
    };
  }

  private async repairMissingCredential(
    workspaceId: string,
    mailbox: Awaited<ReturnType<MailboxesService['getOrThrow']>>,
  ): Promise<
    | {
        mailbox: Awaited<ReturnType<MailboxesService['getOrThrow']>>;
        credentials: { username: string; password: string };
      }
    | null
  > {
    const mgmt = this.managementCreds();
    if (!mgmt) {
      this.log.warn(
        `${c.yellow}🩹${c.reset} sem STALWART_MANAGEMENT_* para autorreparar credencial de ${c.magenta}${mailbox.address}${c.reset}`,
      );
      return null;
    }
    const account = await this.stalwartFindAccountByEmail(mgmt, mailbox.address);
    if (!account?.id) {
      this.log.warn(
        `${c.yellow}🩹${c.reset} conta não encontrada no Stalwart para autorreparar ${c.magenta}${mailbox.address}${c.reset}`,
      );
      return null;
    }

    const appPwdKey = 'hubmailAutoRepair';
    const pwdRes = await this.jmap.invokeStalwartManagement(mgmt, [
      [
        'x:AppPassword/set',
        {
          accountId: account.id,
          create: {
            [appPwdKey]: {
              description: `HubMail auto-repair ${mailbox.address}`,
            },
          },
        },
        'rp1',
      ],
    ]);
    const payload = pwdRes.find((r) => r[0] === 'x:AppPassword/set')?.[1] as {
      created?: Record<string, { secret?: string }>;
    };
    const secret = payload?.created?.[appPwdKey]?.secret;
    const err = this.extractSetError(payload);
    if (!secret || err) {
      this.log.warn(
        `${c.yellow}🩹${c.reset} falha ao gerar app password de autorreparo para ${c.magenta}${mailbox.address}${c.reset}: ${err ?? 'create_failed'}`,
      );
      return null;
    }

    const secretRef = this.crypto.encrypt(secret);
    const credential = await this.prisma.mailCredential.create({
      data: {
        mailboxId: mailbox.id,
        kind: MailCredentialKind.APP_PASSWORD,
        username: mailbox.address,
        secretRef,
      },
    });
    const updated = await this.prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { credentialId: credential.id },
      include: { domain: true, credential: true },
    });
    this.log.log(
      `${c.green}🩹${c.reset} credencial autorreparada para ${c.magenta}${mailbox.address}${c.reset}`,
    );
    return {
      mailbox: updated,
      credentials: {
        username: mailbox.address,
        password: secret,
      },
    };
  }

  async create(workspaceId: string, actor: string, dto: CreateMailboxDto) {
    const address = dto.address.trim().toLowerCase();
    const cleanDisplayName = dto.displayName?.trim() || undefined;
    const principalName =
      dto.username?.trim().toLowerCase().replace(/\s+/g, '') || address.split('@')[0] || 'mailbox';
    if (!address.includes('@')) {
      throw new BadRequestException('Endereço de email inválido');
    }
    const domainName = address.split('@')[1];

    const existing = await this.prisma.mailbox.findUnique({
      where: { workspaceId_address: { workspaceId, address } },
    });
    if (existing) {
      throw new ConflictException('Mailbox já existe neste workspace');
    }

    const domain = await this.prisma.domain.upsert({
      where: { workspaceId_name: { workspaceId, name: domainName } },
      update: {},
      create: {
        workspaceId,
        name: domainName,
        status: DomainStatus.PENDING,
      },
    });

    const mgmt = this.managementCreds();
    if (!mgmt) {
      throw new BadRequestException(
        'Defina STALWART_MANAGEMENT_EMAIL/PASSWORD para provisionar credenciais automaticamente.',
      );
    }
    const password = await this.ensureStalwartMailboxSecret(
      mgmt,
      address,
      principalName,
      cleanDisplayName,
    );
    const secretRef = this.crypto.encrypt(password);

    const mailbox = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mailbox.create({
        data: {
          workspaceId,
          domainId: domain.id,
          address,
          displayName: cleanDisplayName,
        },
      });
      const credential = await tx.mailCredential.create({
        data: {
          mailboxId: created.id,
          kind: MailCredentialKind.APP_PASSWORD,
          secretRef,
          username: address,
        },
      });
      const linked = await tx.mailbox.update({
        where: { id: created.id },
        data: { credentialId: credential.id },
        include: { domain: true, credential: true },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mailbox.created',
          subjectType: 'Mailbox',
          subjectId: linked.id,
          data: { address, domain: domainName },
        },
      });
      return linked;
    });

    this.log.log(
      `${c.green}📬${c.reset} mailbox ${c.magenta}${mailbox.address}${c.reset} criada por ${c.cyan}${actor}${c.reset}`,
    );
    this.log.log(
      `${c.cyan}🔐${c.reset} credencial ${dto.password ? 'fornecida pelo cliente' : 'gerada automaticamente'} para ${c.magenta}${mailbox.address}${c.reset}`,
    );
    if (cleanDisplayName) {
      this.log.log(
        `${c.cyan}🏷️${c.reset} nome exibido definido para ${c.magenta}${mailbox.address}${c.reset}: "${cleanDisplayName}"`,
      );
    }

    return {
      id: mailbox.id,
      address: mailbox.address,
      displayName: mailbox.displayName,
      domain: mailbox.domain.name,
      createdAt: mailbox.createdAt,
      hasCredential: Boolean(mailbox.credentialId),
    };
  }

  async rotateCredential(
    workspaceId: string,
    mailboxId: string,
    actor: string,
    newPassword: string,
    username?: string,
  ) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    const secretRef = this.crypto.encrypt(newPassword);
    const normalizedUsername = (username ?? mailbox.credential?.username ?? mailbox.address).includes('@')
      ? (username ?? mailbox.credential?.username ?? mailbox.address)
      : mailbox.address;
    if (mailbox.credentialId) {
      await this.prisma.mailCredential.update({
        where: { id: mailbox.credentialId },
        data: {
          secretRef,
          username: normalizedUsername,
          rotatedAt: new Date(),
        },
      });
    } else {
      const cred = await this.prisma.mailCredential.create({
        data: {
          mailboxId: mailbox.id,
          kind: MailCredentialKind.APP_PASSWORD,
          secretRef,
          username: normalizedUsername,
        },
      });
      await this.prisma.mailbox.update({
        where: { id: mailbox.id },
        data: { credentialId: cred.id },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'mailbox.credentials.rotated',
        subjectType: 'Mailbox',
        subjectId: mailbox.id,
        data: {},
      },
    });
    this.log.log(
      `${c.green}🔑${c.reset} credencial rodada para ${c.magenta}${mailbox.address}${c.reset}`,
    );
    return { ok: true };
  }

  async invalidateCredential(
    workspaceId: string,
    mailboxId: string,
    reason: string,
  ) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    if (!mailbox.credentialId) return { ok: true };

    const credentialId = mailbox.credentialId;
    await this.prisma.$transaction([
      this.prisma.mailbox.update({
        where: { id: mailbox.id },
        data: { credentialId: null },
      }),
      this.prisma.mailCredential.deleteMany({ where: { id: credentialId } }),
    ]);

    this.log.warn(
      `${c.yellow}🧯${c.reset} credencial invalidada para ${c.magenta}${mailbox.address}${c.reset} (motivo: ${reason})`,
    );
    return { ok: true };
  }

  async remove(workspaceId: string, mailboxId: string, actor: string) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    await this.prisma.$transaction([
      this.prisma.mailbox.delete({ where: { id: mailbox.id } }),
      this.prisma.mailCredential.deleteMany({ where: { mailboxId: mailbox.id } }),
      this.prisma.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mailbox.deleted',
          subjectType: 'Mailbox',
          subjectId: mailbox.id,
          data: { address: mailbox.address },
        },
      }),
    ]);
    this.log.log(`${c.magenta}🗑️  mailbox ${mailbox.address} removida${c.reset}`);
    return { ok: true };
  }

  private normalizeSavedLabelFragment(fragment: string): string {
    const t = fragment.trim().toLowerCase();
    if (!t) {
      throw new BadRequestException('empty label');
    }
    if (t.length > 128) {
      throw new BadRequestException('label too long');
    }
    if (/[<>"]/.test(t)) {
      throw new BadRequestException('invalid characters in label');
    }
    return t;
  }

  async listSavedLabels(workspaceId: string, mailboxId: string) {
    await this.getOrThrow(workspaceId, mailboxId);
    const rows = await this.prisma.mailboxSavedLabel.findMany({
      where: { mailboxId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });
    this.log.debug(
      `${c.cyan}📑${c.reset} listadas ${rows.length} etiquetas guardadas (mailbox ${c.magenta}${mailboxId}${c.reset})`,
    );
    return rows;
  }

  async addSavedLabelsFromRaw(workspaceId: string, mailboxId: string, raw: string) {
    await this.getOrThrow(workspaceId, mailboxId);
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      throw new BadRequestException('no labels provided');
    }
    const normalized: string[] = [];
    for (const p of parts) {
      const n = this.normalizeSavedLabelFragment(p);
      if (!normalized.includes(n)) normalized.push(n);
    }

    await this.prisma.mailboxSavedLabel.createMany({
      data: normalized.map((name) => ({ mailboxId, name })),
      skipDuplicates: true,
    });

    const count = await this.prisma.mailboxSavedLabel.count({ where: { mailboxId } });
    this.log.log(
      `${c.green}➕${c.reset} etiquetas guardadas: ${c.magenta}${normalized.join(', ')}${c.reset} (total na mailbox: ${count})`,
    );
    return this.listSavedLabels(workspaceId, mailboxId);
  }

  async removeSavedLabel(workspaceId: string, mailboxId: string, labelId: string) {
    await this.getOrThrow(workspaceId, mailboxId);
    const deleted = await this.prisma.mailboxSavedLabel.deleteMany({
      where: { id: labelId, mailboxId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('label not found');
    }
    this.log.log(`${c.yellow}🧹${c.reset} etiqueta guardada ${labelId} removida`);
    return { ok: true } as const;
  }
}
