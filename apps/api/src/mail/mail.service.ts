import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OutgoingMessageStatus } from '@prisma/client';
import type {
  EmailMessage,
  MailAddress,
  MailFolderSummary,
  SaveComposeDraftResult,
  SendMailResult,
  ThreadPage,
  ThreadSummary,
} from '@hubmail/types';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlSanitizerService } from './html-sanitizer.service';
import { JmapClient } from './jmap.client';
import { MailboxesService } from './mailboxes.service';
import { MailStreamService } from './mail-stream.service';
import { SmtpService } from './smtp.service';
import type { JmapEmail } from './jmap.types';
import type { SendMailDto } from './dto/send-mail.dto';
import type { PatchMessageDto } from './dto/patch-message.dto';
import type { SaveComposeDraftDto } from './dto/save-compose-draft.dto';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

function mapAddress(list?: JmapEmail['from']): MailAddress[] {
  if (!list) return [];
  return list.map((a) => ({ name: a.name ?? undefined, email: a.email }));
}

function firstAddress(list?: JmapEmail['from']): MailAddress {
  const [first] = mapAddress(list);
  return first ?? { email: '' };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** JMAP usa `role: sent`; servidores podem expor só o nome ("Sent Items"). */
function isSentMailboxFolder(folder: { role?: string | null; name: string }): boolean {
  const role = (folder.role ?? '').toLowerCase().replace(/^\/|\/$/g, '');
  if (role === 'sent') return true;
  const n = folder.name.toLowerCase();
  if (n.includes('draft')) return false;
  if (n.includes('resent')) return false;
  if (n.includes('enviad')) return true;
  if (n.includes('sent items') || n.includes('sent mail')) return true;
  return n.includes('sent');
}

/** Pasta de rascunhos (JMAP `drafts` ou nomes como "Drafts" / "Rascunhos"). */
function isDraftsMailboxFolder(folder: { role?: string | null; name: string }): boolean {
  const role = (folder.role ?? '').toLowerCase().replace(/^\/|\/$/g, '');
  if (role === 'drafts' || role === 'draft') return true;
  const n = folder.name.toLowerCase();
  if (n.includes('rascunh')) return true;
  if (n.includes('borrador')) return true;
  if (n.includes('draft') && !n.includes('sent')) return true;
  return false;
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private static readonly OUTGOING_THREAD_PREFIX = 'outgoing:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxes: MailboxesService,
    private readonly jmap: JmapClient,
    private readonly smtp: SmtpService,
    private readonly sanitizer: HtmlSanitizerService,
    private readonly stream: MailStreamService,
  ) {}

  private isJmapAuthError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
    return (
      msg.includes('jmap session falhou: 401') ||
      msg.includes('jmap call falhou: 401') ||
      (msg.includes('unauthorized') && msg.includes('jmap'))
    );
  }

  private isSmtpAuthError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
    return (
      msg.includes('535') ||
      msg.includes('authentication credentials invalid') ||
      msg.includes('invalid login') ||
      msg.includes('auth') && msg.includes('invalid')
    );
  }

  private async withJmapGuard<T>(
    workspaceId: string,
    mailboxId: string,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (!this.isJmapAuthError(error)) throw error;
      await this.mailboxes.invalidateCredential(workspaceId, mailboxId, 'jmap_401');
      throw new BadRequestException(
        'Credencial da mailbox inválida/expirada. Reconfigure a credencial para continuar.',
      );
    }
  }

  async saveComposeDraft(
    workspaceId: string,
    dto: SaveComposeDraftDto,
  ): Promise<SaveComposeDraftResult> {
    const { mailbox, credentials } = await this.mailboxes.resolveCredentials(workspaceId, dto.mailboxId);
    const folders = await this.withJmapGuard(workspaceId, dto.mailboxId, () =>
      this.jmap.listMailboxes(credentials),
    );
    const draftsFolder = folders.find((f) => isDraftsMailboxFolder(f));
    if (!draftsFolder) {
      this.log.warn(
        `${c.yellow}📭${c.reset} mailbox ${c.magenta}${mailbox.address}${c.reset} sem pasta de rascunhos reconhecida`,
      );
      throw new BadRequestException('Conta sem pasta de rascunhos (JMAP).');
    }

    const toAddrs = (dto.to ?? []).map((e) => ({ email: e.trim() })).filter((a) => a.email.length > 0);
    const ccAddrs = (dto.cc ?? []).map((e) => ({ email: e.trim() })).filter((a) => a.email.length > 0);

    const { id, threadId } = await this.withJmapGuard(workspaceId, dto.mailboxId, () =>
      this.jmap.upsertComposeDraft(credentials, {
        draftsMailboxId: draftsFolder.id,
        fromEmail: mailbox.address,
        fromName: mailbox.displayName,
        to: toAddrs,
        cc: ccAddrs,
        subject: dto.subject,
        bodyText: dto.text,
        inReplyTo: dto.inReplyTo,
        references: dto.references,
        replaceEmailId: dto.replaceEmailId?.trim() || undefined,
      }),
    );

    this.log.log(
      `${c.green}📝${c.reset} rascunho ${c.cyan}${id}${c.reset} na mailbox ${c.magenta}${mailbox.address}${c.reset}`,
    );
    void this.stream.publish({ type: 'mail.updated', workspaceId, mailboxId: mailbox.id });
    return { emailId: id, threadId };
  }

  async listMailboxes(workspaceId: string, mailboxId: string): Promise<MailFolderSummary[]> {
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const folders = await this.withJmapGuard(workspaceId, mailboxId, () =>
      this.jmap.listMailboxes(credentials),
    );
    const base: MailFolderSummary[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      role: f.role ?? undefined,
      parentId: f.parentId ?? undefined,
      sortOrder: f.sortOrder,
      totalEmails: f.totalEmails,
      unreadEmails: f.unreadEmails,
    }));

    const withDraftKeywordTotals = await Promise.all(
      base.map(async (f) => {
        if (!isDraftsMailboxFolder(f)) return f;
        try {
          const n = await this.withJmapGuard(workspaceId, mailboxId, () =>
            this.jmap.countEmailsMatching(credentials, {
              operator: 'AND',
              conditions: [{ inMailbox: f.id }, { hasKeyword: '$draft' }],
            }),
          );
          return { ...f, totalEmails: n };
        } catch {
          this.log.debug(
            `${c.yellow}📂${c.reset} contagem JMAP $draft falhou para ${c.magenta}${f.name}${c.reset}; mantém total da pasta`,
          );
          return f;
        }
      }),
    );
    return withDraftKeywordTotals;
  }

  async listThreads(
    workspaceId: string,
    mailboxId: string,
    opts: { folderId?: string; cursor?: number; limit?: number; search?: string },
  ): Promise<ThreadPage> {
    const { mailbox, credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const folders = await this.withJmapGuard(workspaceId, mailboxId, () =>
      this.jmap.listMailboxes(credentials),
    );
    const selectedFolder = folders.find((f) => f.id === opts.folderId);
    const isSentFolder = selectedFolder ? isSentMailboxFolder(selectedFolder) : false;
    const isDraftsFolder = selectedFolder ? isDraftsMailboxFolder(selectedFolder) : false;
    if (isSentFolder) {
      const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
      const position = Math.max(opts.cursor ?? 0, 0);
      const search = opts.search?.trim();
      const where = {
        workspaceId,
        mailboxId: mailbox.id,
        status: OutgoingMessageStatus.SENT,
        ...(search
          ? {
              OR: [
                { subject: { contains: search, mode: 'insensitive' as const } },
                { toAddrs: { has: search } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        this.prisma.outgoingMessage.count({ where }),
        this.prisma.outgoingMessage.findMany({
          where,
          orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
          skip: position,
          take: limit,
        }),
      ]);
      const threads: ThreadSummary[] = rows.map((row) => ({
        id: `${MailService.OUTGOING_THREAD_PREFIX}${row.id}`,
        anchorEmailId: `outgoing-message:${row.id}`,
        subject: row.subject ?? '(sem assunto)',
        from: { email: row.fromAddr },
        preview: row.bodyText?.slice(0, 220) || stripHtml(row.bodyHtml ?? '').slice(0, 220),
        receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
        unread: false,
        starred: false,
        flags: ['$seen', '$sent'],
        labels: [],
        messagesCount: 1,
      }));
      const nextCursor = position + threads.length;
      return {
        threads,
        total,
        nextCursor: nextCursor < total ? String(nextCursor) : null,
      };
    }

    const { emails, total, nextCursor } = await this.withJmapGuard(workspaceId, mailboxId, () =>
      this.jmap.listThreads(credentials, {
        mailboxId: opts.folderId,
        cursor: opts.cursor,
        limit: opts.limit,
        search: opts.search,
        onlyKeywordDraft: isDraftsFolder,
      }),
    );
    const threads: ThreadSummary[] = emails.map((e) => {
      const labels = Object.keys(e.keywords ?? {}).filter((k) => !k.startsWith('$'));
      const flags = Object.keys(e.keywords ?? {}).filter((k) => k.startsWith('$'));
      return {
        id: e.threadId,
        anchorEmailId: e.id,
        subject: e.subject ?? '(sem assunto)',
        from: firstAddress(e.from),
        preview: e.preview ?? '',
        receivedAt: e.receivedAt,
        unread: !e.keywords?.$seen,
        starred: Boolean(e.keywords?.$flagged),
        flags,
        labels,
        messagesCount: 1,
      };
    });
    return {
      threads,
      total,
      nextCursor: nextCursor !== undefined && nextCursor !== null ? String(nextCursor) : null,
    };
  }

  async getThread(workspaceId: string, mailboxId: string, threadId: string) {
    if (threadId.startsWith(MailService.OUTGOING_THREAD_PREFIX)) {
      const outgoingId = threadId.slice(MailService.OUTGOING_THREAD_PREFIX.length);
      const row = await this.prisma.outgoingMessage.findFirst({
        where: { id: outgoingId, workspaceId, mailboxId, status: OutgoingMessageStatus.SENT },
      });
      if (!row) throw new NotFoundException('Thread não encontrada');
      const message: EmailMessage = {
        id: `outgoing-message:${row.id}`,
        threadId,
        subject: row.subject ?? '(sem assunto)',
        from: { email: row.fromAddr },
        to: row.toAddrs.map((email) => ({ email })),
        cc: row.ccAddrs.map((email) => ({ email })),
        bcc: row.bccAddrs.map((email) => ({ email })),
        replyTo: [],
        receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
        sentAt: row.sentAt?.toISOString() ?? row.createdAt.toISOString(),
        bodyHtml: row.bodyHtml ?? undefined,
        bodyText: row.bodyText ?? undefined,
        flags: ['$seen', '$sent'],
        labels: [],
        attachments: [],
      };
      return { id: threadId, emailIds: [message.id], messages: [message] };
    }
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const result = await this.withJmapGuard(workspaceId, mailboxId, () =>
      this.jmap.getThread(credentials, threadId),
    );
    if (!result) throw new NotFoundException('Thread não encontrada');
    return {
      id: result.thread.id,
      emailIds: result.thread.emailIds,
      messages: result.emails.map((e) => this.mapEmail(e)),
    };
  }

  async getMessageRaw(workspaceId: string, mailboxId: string, emailId: string): Promise<EmailMessage> {
    if (emailId.startsWith('outgoing-message:')) {
      const outgoingId = emailId.slice('outgoing-message:'.length);
      const row = await this.prisma.outgoingMessage.findFirst({
        where: { id: outgoingId, workspaceId, mailboxId, status: OutgoingMessageStatus.SENT },
      });
      if (!row) throw new NotFoundException('Email não encontrado');
      return {
        id: emailId,
        threadId: `${MailService.OUTGOING_THREAD_PREFIX}${row.id}`,
        subject: row.subject ?? '(sem assunto)',
        from: { email: row.fromAddr },
        to: row.toAddrs.map((email) => ({ email })),
        cc: row.ccAddrs.map((email) => ({ email })),
        bcc: row.bccAddrs.map((email) => ({ email })),
        replyTo: [],
        receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
        sentAt: row.sentAt?.toISOString() ?? row.createdAt.toISOString(),
        bodyHtml: row.bodyHtml ?? undefined,
        bodyText: row.bodyText ?? undefined,
        flags: ['$seen', '$sent'],
        labels: [],
        attachments: [],
      };
    }
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const email = await this.withJmapGuard(workspaceId, mailboxId, () =>
      this.jmap.getEmail(credentials, emailId),
    );
    if (!email) throw new NotFoundException('Email não encontrado');
    return this.mapEmail(email);
  }

  async patch(workspaceId: string, emailId: string, patch: PatchMessageDto) {
    /** Enviados HubMail vêm da tabela `outgoing_messages` — não existem no JMAP. */
    if (emailId.startsWith('outgoing-message:')) {
      const outgoingId = emailId.slice('outgoing-message:'.length);
      const mailbox = await this.mailboxes.getOrThrow(workspaceId, patch.mailboxId);
      const row = await this.prisma.outgoingMessage.findFirst({
        where: { id: outgoingId, workspaceId, mailboxId: mailbox.id },
      });
      if (!row) {
        throw new NotFoundException('Mensagem não encontrada');
      }
      if (patch.delete || patch.moveToMailbox) {
        await this.prisma.outgoingMessage.delete({ where: { id: row.id } });
        await this.auditMutation(workspaceId, 'mail.outgoing.removed', row.id, {
          subject: row.subject,
          via: patch.delete ? 'delete' : 'move-to-mailbox',
        });
        this.log.log(
          `${c.yellow}🧺${c.reset} enviado HubMail removido (${c.cyan}${row.id}${c.reset}) — ${patch.delete ? 'DELETE' : '→ lixo (só DB)'}`,
        );
        void this.stream.publish({ type: 'mail.updated', workspaceId, mailboxId: mailbox.id });
        return { ok: true };
      }
      const hasFlagPatch =
        typeof patch.starred === 'boolean' ||
        typeof patch.unread === 'boolean' ||
        Boolean(patch.labels?.length);
      if (hasFlagPatch) {
        throw new BadRequestException(
          'Mensagens só registadas no HubMail (lista Enviados) não suportam marcas; pode removê-las.',
        );
      }
      throw new BadRequestException('Nada para atualizar');
    }

    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, patch.mailboxId);
    const keywords: Record<string, boolean> = {};
    if (typeof patch.starred === 'boolean') keywords.$flagged = patch.starred;
    if (typeof patch.unread === 'boolean') keywords.$seen = !patch.unread;
    if (patch.labels) {
      for (const label of patch.labels) {
        keywords[label] = true;
      }
    }
    let mailboxIds: Record<string, boolean> | undefined;
    if (patch.moveToMailbox) {
      mailboxIds = { [patch.moveToMailbox]: true };
    }
    if (patch.delete) {
      await this.withJmapGuard(workspaceId, patch.mailboxId, () =>
        this.jmap.patchEmail(credentials, emailId, { destroy: true }),
      );
      await this.auditMutation(workspaceId, 'mail.message.deleted', emailId);
      const mb = await this.mailboxes.getOrThrow(workspaceId, patch.mailboxId);
      void this.stream.publish({ type: 'mail.updated', workspaceId, mailboxId: mb.id });
      return { ok: true };
    }
    if (!Object.keys(keywords).length && !mailboxIds) {
      throw new BadRequestException('Nada para atualizar');
    }
    await this.withJmapGuard(workspaceId, patch.mailboxId, () =>
      this.jmap.patchEmail(credentials, emailId, { keywords, mailboxIds }),
    );
    await this.auditMutation(workspaceId, 'mail.message.patched', emailId, { keywords, mailboxIds });
    return { ok: true };
  }

  async send(
    workspaceId: string,
    actor: string,
    dto: SendMailDto,
  ): Promise<SendMailResult> {
    const mailbox = await this.mailboxes.getOrThrow(workspaceId, dto.mailboxId);
    const resolved = await this.mailboxes.resolveCredentials(workspaceId, dto.mailboxId);
    const credentials = resolved.credentials;

    if (!dto.html && !dto.text) {
      throw new BadRequestException('Email precisa de conteúdo html ou text');
    }

    const sanitizedHtml = dto.html ? this.sanitizer.sanitize(dto.html) : undefined;
    const attachments = dto.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.base64, 'base64'),
      contentType: a.contentType,
    }));

    const record = await this.prisma.outgoingMessage.create({
      data: {
        workspaceId,
        mailboxId: mailbox.id,
        fromAddr: mailbox.address,
        toAddrs: dto.to,
        ccAddrs: dto.cc ?? [],
        bccAddrs: dto.bcc ?? [],
        subject: dto.subject,
        bodyHtml: sanitizedHtml,
        bodyText: dto.text,
        inReplyTo: dto.inReplyTo,
        references: dto.references ?? [],
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.content.byteLength,
        })) ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? OutgoingMessageStatus.QUEUED : OutgoingMessageStatus.SENDING,
      },
    });

    if (dto.scheduledAt) {
      this.log.log(
        `${c.yellow}⏳${c.reset} mensagem ${record.id} agendada para ${dto.scheduledAt}`,
      );
      return {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
      };
    }

    try {
      await this.smtp.send(
        { user: credentials.username, pass: credentials.password },
        {
          from: mailbox.address,
          to: dto.to,
          cc: dto.cc,
          bcc: dto.bcc,
          subject: dto.subject,
          html: sanitizedHtml,
          text: dto.text,
          inReplyTo: dto.inReplyTo,
          references: dto.references,
          attachments,
        },
      );
      await this.prisma.outgoingMessage.update({
        where: { id: record.id },
        data: {
          status: OutgoingMessageStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      await this.auditMutation(workspaceId, 'mail.message.sent', record.id, {
        to: dto.to,
        subject: dto.subject,
      }, actor);
      void this.stream.publish({ type: 'mail.sent', workspaceId, mailboxId: mailbox.id });

      const draftId = dto.draftEmailId?.trim();
      if (draftId) {
        try {
          await this.withJmapGuard(workspaceId, dto.mailboxId, () =>
            this.jmap.patchEmail(credentials, draftId, { destroy: true }),
          );
          await this.auditMutation(workspaceId, 'mail.message.deleted', draftId, {
            reason: 'compose-draft-after-send',
          });
          this.log.log(
            `${c.magenta}🧹${c.reset} rascunho JMAP removido após envio: ${c.cyan}${draftId}${c.reset}`,
          );
          void this.stream.publish({ type: 'mail.updated', workspaceId, mailboxId: mailbox.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log.warn(
            `${c.yellow}⚠️${c.reset} não foi possível apagar rascunho pós-envio (${draftId}): ${msg}`,
          );
        }
      }

      this.log.log(
        `${c.green}📮${c.reset} ${c.magenta}${mailbox.address}${c.reset} → ${dto.to.join(',')} (${record.id})`,
      );
      return { id: record.id, status: OutgoingMessageStatus.SENT, createdAt: record.createdAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.isSmtpAuthError(error)) {
        await this.mailboxes.invalidateCredential(workspaceId, dto.mailboxId, 'smtp_535');
      }
      await this.prisma.outgoingMessage.update({
        where: { id: record.id },
        data: {
          status: OutgoingMessageStatus.FAILED,
          lastError: message,
          attempts: { increment: 1 },
        },
      });
      if (this.isSmtpAuthError(error)) {
        throw new BadRequestException(
          'Credencial SMTP inválida/expirada para esta mailbox. Reconfigure a credencial e tente novamente.',
        );
      }
      throw error;
    }
  }

  private mapEmail(e: JmapEmail): EmailMessage {
    const htmlPart = e.htmlBody?.[0]?.partId;
    const textPart = e.textBody?.[0]?.partId;
    const bodyHtmlRaw = htmlPart ? e.bodyValues?.[htmlPart]?.value : undefined;
    const bodyText = textPart ? e.bodyValues?.[textPart]?.value : undefined;
    const bodyHtml = bodyHtmlRaw ? this.sanitizer.sanitize(bodyHtmlRaw) : undefined;
    const labels = Object.keys(e.keywords ?? {}).filter((k) => !k.startsWith('$'));
    const flags = Object.keys(e.keywords ?? {}).filter((k) => k.startsWith('$'));
    return {
      id: e.id,
      threadId: e.threadId,
      subject: e.subject ?? '(sem assunto)',
      from: firstAddress(e.from),
      to: mapAddress(e.to),
      cc: mapAddress(e.cc),
      bcc: mapAddress(e.bcc),
      replyTo: mapAddress(e.replyTo),
      receivedAt: e.receivedAt,
      sentAt: e.sentAt ?? undefined,
      bodyHtml,
      bodyText,
      inReplyTo: e.inReplyTo?.[0],
      references: e.references ?? undefined,
      flags,
      labels,
      attachments: (e.attachments ?? []).map((a) => ({
        id: a.blobId,
        name: a.name ?? 'anexo',
        contentType: a.type ?? 'application/octet-stream',
        size: a.size ?? 0,
        inline: a.disposition === 'inline',
      })),
    };
  }

  private async auditMutation(
    workspaceId: string,
    action: string,
    subjectId: string,
    data: Record<string, unknown> = {},
    actor?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor: actor ?? null,
        action,
        subjectType: 'Mail',
        subjectId,
        data: data as never,
      },
    });
  }
}
