import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  JmapEmail,
  JmapInvocation,
  JmapMailboxSummary,
  JmapResponse,
  JmapSession,
  JmapThread,
} from './jmap.types';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

export interface JmapCredentials {
  username: string;
  password: string;
}

const MAIL_CAP = 'urn:ietf:params:jmap:mail';
const CORE_CAP = 'urn:ietf:params:jmap:core';
const STALWART_CAP = 'urn:stalwart:jmap';
const PRINCIPALS_CAP = 'urn:ietf:params:jmap:principals';

/** Node sets `error.cause` on fetch failures; avoid `Error.cause` typing (needs lib es2022+). */
function errorChainDetail(err: unknown): string {
  if (!(err instanceof Error)) return '';
  const nested = (err as Error & { cause?: unknown }).cause;
  if (nested instanceof Error) return nested.message;
  if (typeof nested === 'string') return nested;
  return '';
}

function errorChainFullText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur instanceof Error && depth < 6) {
    parts.push(cur.message);
    cur = (cur as Error & { cause?: unknown }).cause;
    depth += 1;
  }
  return parts.join(' ').toLowerCase();
}

/** OpenSSL/client TLS noise when speaking TLS to a socket that returns plain HTTP (reverse-proxy split). */
function isLikelyTlsOverHttpResponse(err: unknown): boolean {
  const t = errorChainFullText(err);
  return (
    t.includes('packet length too long') ||
    t.includes('wrong version number') ||
    t.includes('tls_get_more_records') ||
    t.includes('ssl routines') ||
    t.includes('decryption failed or bad record mac') ||
    t.includes('record layer failure')
  );
}

function httpsToHttpSameResource(apiUrl: string): string | null {
  try {
    const u = new URL(apiUrl);
    if (u.protocol !== 'https:') return null;
    u.protocol = 'http:';
    if (u.port === '443') u.port = '';
    return u.href;
  } catch {
    return null;
  }
}

function httpsToHttpPortSameResource(apiUrl: string, port: number): string | null {
  try {
    const u = new URL(apiUrl);
    if (u.protocol !== 'https:') return null;
    u.protocol = 'http:';
    u.port = String(port);
    return u.href;
  } catch {
    return null;
  }
}

@Injectable()
export class JmapClient {
  private readonly log = new Logger(JmapClient.name);
  private readonly sessionCache = new Map<string, { session: JmapSession; fetchedAt: number }>();
  private readonly apiHttpHintByHost = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  private hostKey(url: string): string | null {
    try {
      const u = new URL(url);
      return u.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private sessionUrl(): string {
    const url =
      this.config.get<string>('STALWART_JMAP_URL')?.trim() ||
      `${this.config.get<string>('STALWART_BASE_URL')?.trim() ?? ''}/jmap/session`;
    if (!url) {
      throw new BadGatewayException('Defina STALWART_JMAP_URL no .env');
    }
    return url.endsWith('/jmap/session') ? url : `${url.replace(/\/$/, '')}/jmap/session`;
  }

  /** Strip `/jmap/` → `/jmap` so reverse-proxy prefix rules match reliably. */
  private normalizeJmapResourceHref(href: string): string {
    const u = new URL(href);
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    }
    return u.href;
  }

  /**
   * Stalwart often advertises apiUrl/downloadUrl/uploadUrl with the internal bind host
   * (e.g. http://127.0.0.1:8080) while the session is fetched via the public HTTPS URL.
   * Node fetch then fails with "fetch failed". Keep path/query from the server response
   * but force the same origin as the configured session endpoint.
   *
   * When the advertised host already matches the session host, keep scheme and port from
   * the server (e.g. http://mail.example/jmap while session is https://mail.example/jmap/session).
   * Forcing https://…/jmap on 443 when nginx only proxies JMAP over HTTP on that path yields
   * OpenSSL `packet length too long` (TLS client reading plain HTTP).
   */
  private rewriteJmapResourceUrl(sessionEndpoint: string, resourceUrl: string): string {
    const base = new URL(sessionEndpoint);
    const target = new URL(resourceUrl, base);

    let out: string;
    if (target.hostname.toLowerCase() === base.hostname.toLowerCase()) {
      out = target.href;
      if (target.protocol === 'http:' && base.protocol === 'https:') {
        this.log.debug(
          `${c.yellow}📎${c.reset} JMAP URL no mesmo host mantém ${c.yellow}http${c.reset} anunciado pelo servidor (${target.pathname}) — ajuste o proxy ou STALWART_JMAP_API_URL se precisar de TLS aqui.`,
        );
      }
    } else {
      out = `${base.origin}${target.pathname}${target.search}${target.hash}`;
      if (out !== target.href) {
        this.log.debug(
          `${c.yellow}🔀${c.reset} JMAP URL repointed: ${c.yellow}${target.origin}${c.reset} → ${c.green}${base.origin}${c.reset} (${target.pathname})`,
        );
      }
    }
    return this.normalizeJmapResourceHref(out);
  }

  private authHeader(creds: JmapCredentials): string {
    return `Basic ${Buffer.from(`${creds.username}:${creds.password}`, 'utf8').toString('base64')}`;
  }

  async getSession(creds: JmapCredentials): Promise<JmapSession> {
    const cacheKey = creds.username;
    const cached = this.sessionCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      return cached.session;
    }

    const url = this.sessionUrl();
    this.log.debug(`${c.cyan}🧭${c.reset} JMAP session → ${url}`);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader(creds) },
      });
    } catch (err) {
      const tlsMismatch = isLikelyTlsOverHttpResponse(err) && url.startsWith('https:');
      const alt8080 = tlsMismatch ? httpsToHttpPortSameResource(url, 8080) : null;
      if (alt8080 && alt8080 !== url) {
        this.log.warn(
          `${c.yellow}🔁${c.reset} JMAP session HTTPS falhou com padrão TLS/HTTP misto; a tentar ${c.cyan}${alt8080}${c.reset}…`,
        );
        try {
          res = await fetch(alt8080, {
            method: 'GET',
            headers: { Authorization: this.authHeader(creds) },
          });
        } catch (retryErr) {
          const retryCause = errorChainDetail(retryErr);
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          this.log.error(
            `${c.red}❌${c.reset} JMAP session retry em :8080 falhou${retryCause ? ` (${retryCause})` : ''}: ${retryMsg}`,
          );
          throw new BadGatewayException(
            `JMAP session indisponível: ${retryMsg}${retryCause ? ` — ${retryCause}` : ''}`,
          );
        }
      } else {
      const cause = errorChainDetail(err);
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(
        `${c.red}❌${c.reset} JMAP session fetch falhou${cause ? ` (${cause})` : ''}: ${msg}`,
      );
      throw new BadGatewayException(`JMAP session indisponível: ${msg}${cause ? ` — ${cause}` : ''}`);
      }
    }
    if (!res.ok) {
      const text = await res.text();
      this.log.error(`${c.red}❌ JMAP session falhou (${res.status}):${c.reset} ${text}`);
      throw new BadGatewayException(`JMAP session falhou: ${res.status}`);
    }
    const raw = (await res.json()) as {
      apiUrl: string;
      downloadUrl: string;
      uploadUrl: string;
      primaryAccounts: Record<string, string>;
      accounts?: Record<string, { name?: string; isPersonal?: boolean }>;
    };
    const rw = (u: string) => this.rewriteJmapResourceUrl(url, u);
    const apiOverride = this.config.get<string>('STALWART_JMAP_API_URL')?.trim();
    const session: JmapSession = {
      apiUrl: apiOverride ? this.normalizeJmapResourceHref(apiOverride) : rw(raw.apiUrl),
      downloadUrl: rw(raw.downloadUrl),
      uploadUrl: rw(raw.uploadUrl),
      primaryAccounts: raw.primaryAccounts,
      accounts: raw.accounts ?? {},
    };
    if (!apiOverride) {
      const key = this.hostKey(session.apiUrl);
      const hinted = key ? this.apiHttpHintByHost.get(key) : null;
      if (hinted) {
        session.apiUrl = this.normalizeJmapResourceHref(hinted);
        this.log.debug(
          `${c.yellow}🧠${c.reset} reuso de hint HTTP para JMAP API em ${c.cyan}${key}${c.reset} → ${c.cyan}${session.apiUrl}${c.reset}`,
        );
      }
    }
    if (apiOverride) {
      this.log.debug(`${c.cyan}⚙️${c.reset} JMAP apiUrl fixo via STALWART_JMAP_API_URL → ${session.apiUrl}`);
    }
    this.sessionCache.set(cacheKey, { session, fetchedAt: Date.now() });
    this.log.log(`${c.green}🟢${c.reset} JMAP session ok (user ${creds.username})`);
    return session;
  }

  private primaryAccountId(session: JmapSession): string {
    const accountId = session.primaryAccounts[MAIL_CAP];
    if (!accountId) {
      throw new BadGatewayException('JMAP session não expõe accountId para urn:ietf:params:jmap:mail');
    }
    return accountId;
  }

  private async postJmap(
    session: JmapSession,
    creds: JmapCredentials,
    using: string[],
    calls: JmapInvocation[],
    opts?: { tlsMismatchRetried?: boolean },
  ): Promise<JmapInvocation[]> {
    const body = { using, methodCalls: calls };
    let res: Response;
    try {
      res = await fetch(session.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(creds),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const cause = errorChainDetail(err);
      const msg = err instanceof Error ? err.message : String(err);
      const canRetryHttp =
        !opts?.tlsMismatchRetried &&
        isLikelyTlsOverHttpResponse(err) &&
        session.apiUrl.startsWith('https:');
      const httpAlt8080 = canRetryHttp ? httpsToHttpPortSameResource(session.apiUrl, 8080) : null;
      const httpAlt = canRetryHttp ? httpsToHttpSameResource(session.apiUrl) : null;
      const fallbackTarget = httpAlt8080 ?? httpAlt;
      if (fallbackTarget && fallbackTarget !== session.apiUrl) {
        const key = this.hostKey(session.apiUrl);
        if (key) {
          this.apiHttpHintByHost.set(key, fallbackTarget);
        }
        this.log.warn(
          `${c.yellow}🔁${c.reset} JMAP POST em HTTPS rebentou com TLS inesperado (${c.red}${cause || msg}${c.reset}). ` +
            `Muito comum: nginx a servir HTTP nesse path. A tentar ${c.cyan}${fallbackTarget}${c.reset} (uma vez)…`,
        );
        session.apiUrl = this.normalizeJmapResourceHref(fallbackTarget);
        return this.postJmap(session, creds, using, calls, { tlsMismatchRetried: true });
      }
      this.log.error(
        `${c.red}❌${c.reset} JMAP fetch POST falhou → ${c.cyan}${session.apiUrl}${c.reset}${cause ? ` (${cause})` : ''}: ${msg}`,
      );
      throw new BadGatewayException(`JMAP indisponível: ${msg}${cause ? ` — ${cause}` : ''}`);
    }
    if (!res.ok) {
      const text = await res.text();
      this.log.error(
        `${c.red}❌ JMAP invoke falhou (${res.status}):${c.reset} ${text.slice(0, 300)}`,
      );
      throw new BadGatewayException(`JMAP call falhou: ${res.status}`);
    }
    const data = (await res.json()) as JmapResponse;
    return data.methodResponses;
  }

  private async invoke(
    session: JmapSession,
    creds: JmapCredentials,
    calls: JmapInvocation[],
  ): Promise<JmapInvocation[]> {
    return this.postJmap(session, creds, [CORE_CAP, MAIL_CAP], calls);
  }

  /**
   * Chamadas de gestão Stalwart (x:Domain/*, etc.) — mesma sessão JMAP que o WebAdmin/CLI.
   * Requer credenciais com permissões sysDomain* (ex.: administrador).
   */
  async invokeStalwartManagement(
    creds: JmapCredentials,
    calls: JmapInvocation[],
  ): Promise<JmapInvocation[]> {
    const session = await this.getSession(creds);
    this.log.debug(
      `${c.magenta}🛰️${c.reset} Stalwart management JMAP (${calls.length} chamada(s)) → ${c.cyan}${session.apiUrl}${c.reset}`,
    );
    return this.postJmap(session, creds, [CORE_CAP, STALWART_CAP, PRINCIPALS_CAP], calls);
  }

  /**
   * Conta emails com um filtro JMAP (ex.: rascunhos com `hasKeyword: $draft`).
   * `limit: 0` + `calculateTotal` evita trazer ids.
   */
  async countEmailsMatching(creds: JmapCredentials, filter: Record<string, unknown>): Promise<number> {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const responses = await this.invoke(session, creds, [
      [
        'Email/query',
        {
          accountId,
          filter,
          limit: 0,
          calculateTotal: true,
        },
        '0',
      ],
    ]);
    const q = responses[0]?.[1] as { total?: number } | undefined;
    return Number(q?.total ?? 0);
  }

  private buildEmailQueryFilter(opts: {
    mailboxId?: string;
    search?: string;
    /** Só mensagens com keyword $draft (pasta Rascunhos sem itens “fantasma”). */
    onlyKeywordDraft?: boolean;
  }): Record<string, unknown> {
    const inM = opts.mailboxId;
    const text = opts.search?.trim();
    const wantDraft = Boolean(opts.onlyKeywordDraft && inM);
    const conditions: Record<string, unknown>[] = [];
    if (inM) conditions.push({ inMailbox: inM });
    if (wantDraft) conditions.push({ hasKeyword: '$draft' });
    if (text) conditions.push({ text });
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0]!;
    return { operator: 'AND', conditions };
  }

  async listMailboxes(creds: JmapCredentials): Promise<JmapMailboxSummary[]> {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const responses = await this.invoke(session, creds, [
      ['Mailbox/get', { accountId, ids: null }, '0'],
    ]);
    const mailboxResult = responses.find((r) => r[0] === 'Mailbox/get');
    if (!mailboxResult) return [];
    const list = (mailboxResult[1] as { list?: JmapMailboxSummary[] }).list ?? [];
    return list.map((mb) => ({
      id: mb.id,
      name: mb.name,
      role: mb.role ?? null,
      parentId: mb.parentId ?? null,
      totalEmails: Number(mb.totalEmails ?? 0),
      unreadEmails: Number(mb.unreadEmails ?? 0),
      sortOrder: mb.sortOrder ?? 0,
    }));
  }

  async listThreads(
    creds: JmapCredentials,
    opts: {
      mailboxId?: string;
      cursor?: number;
      limit?: number;
      search?: string;
      onlyKeywordDraft?: boolean;
    },
  ) {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const position = opts.cursor ?? 0;
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const filter = this.buildEmailQueryFilter({
      mailboxId: opts.mailboxId,
      search: opts.search,
      onlyKeywordDraft: opts.onlyKeywordDraft,
    });

    const responses = await this.invoke(session, creds, [
      [
        'Email/query',
        {
          accountId,
          filter,
          sort: [{ property: 'receivedAt', isAscending: false }],
          position,
          limit,
          collapseThreads: true,
        },
        '0',
      ],
      [
        'Email/get',
        {
          accountId,
          '#ids': { resultOf: '0', name: 'Email/query', path: '/ids' },
          properties: [
            'id',
            'threadId',
            'mailboxIds',
            'keywords',
            'subject',
            'preview',
            'from',
            'to',
            'cc',
            'bcc',
            'receivedAt',
            'sentAt',
            'hasAttachment',
          ],
        },
        '1',
      ],
    ]);
    const queryResult = responses.find((r) => r[0] === 'Email/query')?.[1] as {
      ids?: string[];
      total?: number;
      position?: number;
    } | undefined;
    const getResult = responses.find((r) => r[0] === 'Email/get')?.[1] as
      | { list?: JmapEmail[] }
      | undefined;
    const emails = getResult?.list ?? [];
    return {
      emails,
      total: queryResult?.total ?? emails.length,
      position: queryResult?.position ?? position,
      nextCursor: (queryResult?.position ?? position) + emails.length,
    };
  }

  async getThread(creds: JmapCredentials, threadId: string) {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const responses = await this.invoke(session, creds, [
      ['Thread/get', { accountId, ids: [threadId] }, '0'],
      [
        'Email/get',
        {
          accountId,
          '#ids': { resultOf: '0', name: 'Thread/get', path: '/list/*/emailIds' },
          properties: [
            'id',
            'threadId',
            'mailboxIds',
            'keywords',
            'subject',
            'preview',
            'from',
            'to',
            'cc',
            'bcc',
            'replyTo',
            'receivedAt',
            'sentAt',
            'hasAttachment',
            'inReplyTo',
            'references',
            'attachments',
            'htmlBody',
            'textBody',
            'bodyValues',
          ],
          fetchHTMLBodyValues: true,
          fetchTextBodyValues: true,
        },
        '1',
      ],
    ]);
    const thread = (responses.find((r) => r[0] === 'Thread/get')?.[1] as {
      list?: JmapThread[];
    } | undefined)?.list?.[0];
    const emails =
      (responses.find((r) => r[0] === 'Email/get')?.[1] as { list?: JmapEmail[] } | undefined)
        ?.list ?? [];
    if (!thread) {
      return null;
    }
    return { thread, emails };
  }

  async getEmail(creds: JmapCredentials, emailId: string) {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const responses = await this.invoke(session, creds, [
      [
        'Email/get',
        {
          accountId,
          ids: [emailId],
          properties: [
            'id',
            'threadId',
            'mailboxIds',
            'keywords',
            'subject',
            'from',
            'to',
            'cc',
            'bcc',
            'replyTo',
            'receivedAt',
            'sentAt',
            'htmlBody',
            'textBody',
            'bodyValues',
            'attachments',
            'inReplyTo',
            'references',
          ],
          fetchHTMLBodyValues: true,
          fetchTextBodyValues: true,
        },
        '0',
      ],
    ]);
    const list =
      (responses[0]?.[1] as { list?: JmapEmail[] } | undefined)?.list ?? [];
    return list[0] ?? null;
  }

  async downloadBlob(
    creds: JmapCredentials,
    blobId: string,
    opts: { contentType?: string; name?: string },
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; contentLength: string | null }> {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const type = opts.contentType?.trim() || 'application/octet-stream';
    const name = opts.name?.trim() || 'attachment';
    // Stalwart returns the downloadUrl template with URL-encoded braces
    // (e.g. %7BaccountId%7D), so substitute both raw and encoded variants.
    const substitute = (template: string, key: string, value: string) =>
      template
        .replace(`{${key}}`, value)
        .replace(`%7B${key}%7D`, value)
        .replace(`%7b${key}%7d`, value);
    let url = session.downloadUrl;
    url = substitute(url, 'accountId', encodeURIComponent(accountId));
    url = substitute(url, 'blobId', encodeURIComponent(blobId));
    url = substitute(url, 'type', encodeURIComponent(type));
    url = substitute(url, 'name', encodeURIComponent(name));
    const res = await fetch(url, { headers: { Authorization: this.authHeader(creds) } });
    if (!res.ok || !res.body) {
      const text = res.body ? await res.text() : '';
      // eslint-disable-next-line no-console
      console.error(
        `[jmap.downloadBlob] ${res.status} url=${url} blobId=${blobId} accountId=${accountId} responseBody=${text.slice(0, 500)}`,
      );
      this.log.error(`${c.red}❌ JMAP download falhou (${res.status}):${c.reset} ${text}`);
      throw new BadGatewayException(`JMAP download falhou: ${res.status}`);
    }
    return {
      stream: res.body,
      contentType: res.headers.get('content-type') ?? type,
      contentLength: res.headers.get('content-length'),
    };
  }

  async patchEmail(
    creds: JmapCredentials,
    emailId: string,
    patch: {
      keywords?: Record<string, boolean>;
      mailboxIds?: Record<string, boolean>;
      destroy?: boolean;
    },
  ) {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);
    const update: Record<string, Record<string, unknown>> = {};
    if (!patch.destroy) {
      const change: Record<string, unknown> = {};
      if (patch.keywords) {
        for (const [k, v] of Object.entries(patch.keywords)) {
          change[`keywords/${k}`] = v || null;
        }
      }
      if (patch.mailboxIds) {
        for (const [k, v] of Object.entries(patch.mailboxIds)) {
          change[`mailboxIds/${k}`] = v || null;
        }
      }
      update[emailId] = change;
    }
    const calls: JmapInvocation[] = [
      [
        'Email/set',
        {
          accountId,
          update: Object.keys(update).length ? update : undefined,
          destroy: patch.destroy ? [emailId] : undefined,
        },
        '0',
      ],
    ];
    const responses = await this.invoke(session, creds, calls);
    const result = responses[0]?.[1] as {
      updated?: Record<string, unknown>;
      destroyed?: string[];
      notUpdated?: Record<string, { type: string; description?: string }>;
      notDestroyed?: Record<string, { type: string; description?: string }>;
    };
    const failedUpdate = result?.notUpdated?.[emailId];
    const failedDestroy = result?.notDestroyed?.[emailId];
    const failed = failedUpdate || failedDestroy;
    if (failed) {
      /**
       * Rascunho já substituído por Email/set rotate / corrida com auto-save: o id antigo
       * deixa de existir. Destroy com notFound já era no-op; mover/marcar com id obsoleto
       * deve ser idempotente para não quebrar a UI (ex.: "para lixo" com lista desatualizada).
       */
      if (failed.type === 'notFound') {
        this.log.debug(
          `${c.cyan}🗑️${c.reset} Email/set: ${emailId} já inexistente (notFound) — ${patch.destroy ? 'destroy' : 'update'} ignorado`,
        );
        return { ok: true };
      }
      throw new BadGatewayException(`JMAP Email/set falhou: ${failed.type}`);
    }
    this.log.debug(
      `${c.cyan}✍️${c.reset}  email ${emailId} atualizado (destroy=${Boolean(patch.destroy)})`,
    );
    return { ok: true };
  }

  /**
   * Guarda rascunho na pasta Drafts (JMAP): cria Email com $draft e, se houver
   * replaceEmailId, destrói o anterior no mesmo Email/set (RFC 8621 §4.6).
   */
  async sendEmail(
    creds: JmapCredentials,
    args: {
      sentMailboxId: string;
      fromEmail: string;
      fromName?: string | null;
      to: Array<{ email: string; name?: string | null }>;
      cc?: Array<{ email: string; name?: string | null }>;
      bcc?: Array<{ email: string; name?: string | null }>;
      subject: string;
      html?: string | null;
      text?: string | null;
      inReplyTo?: string | null;
      references?: string[] | null;
    },
  ): Promise<{ emailId: string; messageId: string | null }> {
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);

    const from: Array<{ email: string; name?: string | null }> = [
      args.fromName?.trim()
        ? { email: args.fromEmail, name: args.fromName.trim() }
        : { email: args.fromEmail },
    ];

    const bodyParts: Record<string, unknown> = {};
    const bodyStructureChildren: unknown[] = [];

    if (args.html && args.text) {
      bodyParts['p-txt'] = { value: args.text, isTruncated: false };
      bodyParts['p-html'] = { value: args.html, isTruncated: false };
      bodyStructureChildren.push({ type: 'text/plain', partId: 'p-txt' });
      bodyStructureChildren.push({ type: 'text/html', partId: 'p-html' });
    } else if (args.html) {
      bodyParts['p-html'] = { value: args.html, isTruncated: false };
      bodyStructureChildren.push({ type: 'text/html', partId: 'p-html' });
    } else {
      const txt = args.text ?? ' ';
      bodyParts['p-txt'] = { value: txt, isTruncated: false };
      bodyStructureChildren.push({ type: 'text/plain', partId: 'p-txt' });
    }

    const bodyStructure =
      bodyStructureChildren.length === 1
        ? bodyStructureChildren[0]
        : { type: 'multipart/alternative', subParts: bodyStructureChildren };

    const emailDoc: Record<string, unknown> = {
      mailboxIds: { [args.sentMailboxId]: true },
      keywords: { $seen: true },
      from,
      subject: args.subject,
      bodyStructure,
      bodyValues: bodyParts,
    };

    if (args.to?.length) emailDoc.to = args.to;
    if (args.cc?.length) emailDoc.cc = args.cc;
    if (args.bcc?.length) emailDoc.bcc = args.bcc;
    const irt = args.inReplyTo?.trim();
    if (irt) emailDoc.inReplyTo = [irt];
    const refs = (args.references ?? []).map((r) => r.trim()).filter(Boolean);
    if (refs.length) emailDoc.references = refs;

    const allRcpt = [
      ...(args.to ?? []),
      ...(args.cc ?? []),
      ...(args.bcc ?? []),
    ].map((r) => ({ email: r.email }));

    const calls: JmapInvocation[] = [
      [
        'Email/set',
        { accountId, create: { send: emailDoc } },
        'e0',
      ],
      [
        'EmailSubmission/set',
        {
          accountId,
          create: {
            sub: {
              '#emailId': { resultOf: 'e0', name: 'Email/set', path: '/created/send/id' },
              envelope: {
                mailFrom: { email: args.fromEmail },
                rcptTo: allRcpt,
              },
            },
          },
        },
        's0',
      ],
    ];

    const responses = await this.invoke(session, creds, calls);

    const emailResult = responses.find((r) => r[2] === 'e0')?.[1] as {
      created?: Record<string, { id?: string; messageId?: string[] }>;
      notCreated?: Record<string, { type?: string; description?: string }>;
    };
    const subResult = responses.find((r) => r[2] === 's0')?.[1] as {
      created?: Record<string, { id?: string }>;
      notCreated?: Record<string, { type?: string; description?: string }>;
    };

    const emailNotCreated = emailResult?.notCreated?.['send'];
    if (emailNotCreated) {
      const detail = emailNotCreated.description ?? emailNotCreated.type ?? 'unknown';
      this.log.error(`${c.red}📤${c.reset} Email/set falhou: ${detail}`);
      throw new BadGatewayException(`JMAP send Email/set: ${detail}`);
    }

    const subNotCreated = subResult?.notCreated?.['sub'];
    if (subNotCreated) {
      const detail = subNotCreated.description ?? subNotCreated.type ?? 'unknown';
      this.log.error(`${c.red}📤${c.reset} EmailSubmission/set falhou: ${detail}`);
      throw new BadGatewayException(`JMAP send EmailSubmission/set: ${detail}`);
    }

    const emailId = emailResult?.created?.['send']?.id;
    if (!emailId) {
      throw new BadGatewayException('JMAP send: Email/set sem id na resposta');
    }

    const messageId = emailResult?.created?.['send']?.messageId?.[0] ?? null;
    this.log.log(
      `${c.green}🚀${c.reset} JMAP EmailSubmission enviado: emailId=${c.cyan}${emailId}${c.reset}`,
    );
    return { emailId, messageId };
  }

  async upsertComposeDraft(
    creds: JmapCredentials,
    args: {
      draftsMailboxId: string;
      fromEmail: string;
      fromName?: string | null;
      to: Array<{ email: string; name?: string | null }>;
      cc: Array<{ email: string; name?: string | null }>;
      subject?: string | null;
      bodyText: string;
      inReplyTo?: string | null;
      references?: string[] | null;
      replaceEmailId?: string | null;
    },
  ): Promise<{ id: string; threadId: string }> {
    const COMPOSE_DRAFT_CREATE_ID = 'hubdraft';
    const session = await this.getSession(creds);
    const accountId = this.primaryAccountId(session);

    const from: Array<{ email: string; name?: string | null }> = [
      args.fromName?.trim()
        ? { email: args.fromEmail, name: args.fromName.trim() }
        : { email: args.fromEmail },
    ];

    const createDoc: Record<string, unknown> = {
      mailboxIds: { [args.draftsMailboxId]: true },
      keywords: { $draft: true, $seen: true },
      from,
      bodyStructure: {
        type: 'text/plain',
        partId: 'txt',
      },
      bodyValues: {
        txt: {
          value: args.bodyText.length ? args.bodyText : ' ',
          isTruncated: false,
        },
      },
    };

    const subj = args.subject?.trim();
    if (subj) createDoc.subject = subj;
    if (args.to.length) createDoc.to = args.to;
    if (args.cc.length) createDoc.cc = args.cc;
    const irt = args.inReplyTo?.trim();
    if (irt) createDoc.inReplyTo = [irt];
    const refs = (args.references ?? []).map((r) => r.trim()).filter(Boolean);
    if (refs.length) createDoc.references = refs;

    const calls: JmapInvocation[] = [
      [
        'Email/set',
        {
          accountId,
          create: { [COMPOSE_DRAFT_CREATE_ID]: createDoc },
          destroy: args.replaceEmailId ? [args.replaceEmailId] : undefined,
        },
        '0',
      ],
    ];
    const responses = await this.invoke(session, creds, calls);
    const result = responses[0]?.[1] as {
      created?: Record<string, { id?: string; threadId?: string }>;
      notCreated?: Record<string, { type?: string; description?: string }>;
      notDestroyed?: Record<string, { type?: string; description?: string }>;
    };
    const created = result?.created?.[COMPOSE_DRAFT_CREATE_ID];
    const notCreated = result?.notCreated?.[COMPOSE_DRAFT_CREATE_ID];
    if (notCreated) {
      const detail = notCreated.description ?? notCreated.type ?? 'unknown';
      this.log.error(
        `${c.red}📝${c.reset} Email/set rascunho falhou: ${c.yellow}${notCreated.type}${c.reset} — ${detail}`,
      );
      throw new BadGatewayException(`JMAP rascunho: ${notCreated.type}`);
    }
    if (args.replaceEmailId && result?.notDestroyed?.[args.replaceEmailId]) {
      const nd = result.notDestroyed[args.replaceEmailId];
      this.log.warn(
        `${c.yellow}🗑️${c.reset} não destruído rascunho antigo ${args.replaceEmailId}: ${nd?.type ?? ''}`,
      );
    }
    const id = created?.id;
    const threadId = created?.threadId;
    if (!id || !threadId) {
      this.log.error(`${c.red}📝${c.reset} Email/set sem id/threadId na resposta de rascunho`);
      throw new BadGatewayException('JMAP rascunho: resposta incompleta');
    }
    this.log.debug(`${c.green}📝${c.reset} rascunho JMAP ${c.cyan}${id}${c.reset} (thread ${threadId})`);
    return { id, threadId };
  }
}
