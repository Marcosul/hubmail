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
  SendMailResult,
  ThreadPage,
  ThreadSummary,
} from '@hubmail/types';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlSanitizerService } from './html-sanitizer.service';
import { JmapClient } from './jmap.client';
import { MailboxesService } from './mailboxes.service';
import { SmtpService } from './smtp.service';
import type { JmapEmail } from './jmap.types';
import type { SendMailDto } from './dto/send-mail.dto';
import type { PatchMessageDto } from './dto/patch-message.dto';

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

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxes: MailboxesService,
    private readonly jmap: JmapClient,
    private readonly smtp: SmtpService,
    private readonly sanitizer: HtmlSanitizerService,
  ) {}

  async listMailboxes(workspaceId: string, mailboxId: string): Promise<MailFolderSummary[]> {
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const folders = await this.jmap.listMailboxes(credentials);
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      role: f.role ?? undefined,
      parentId: f.parentId ?? undefined,
      sortOrder: f.sortOrder,
      totalEmails: f.totalEmails,
      unreadEmails: f.unreadEmails,
    }));
  }

  async listThreads(
    workspaceId: string,
    mailboxId: string,
    opts: { folderId?: string; cursor?: number; limit?: number; search?: string },
  ): Promise<ThreadPage> {
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const { emails, total, nextCursor } = await this.jmap.listThreads(credentials, {
      mailboxId: opts.folderId,
      cursor: opts.cursor,
      limit: opts.limit,
      search: opts.search,
    });
    const threads: ThreadSummary[] = emails.map((e) => {
      const labels = Object.keys(e.keywords ?? {}).filter((k) => !k.startsWith('$'));
      const flags = Object.keys(e.keywords ?? {}).filter((k) => k.startsWith('$'));
      return {
        id: e.threadId,
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
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const result = await this.jmap.getThread(credentials, threadId);
    if (!result) throw new NotFoundException('Thread não encontrada');
    return {
      id: result.thread.id,
      emailIds: result.thread.emailIds,
      messages: result.emails.map((e) => this.mapEmail(e)),
    };
  }

  async getMessageRaw(workspaceId: string, mailboxId: string, emailId: string): Promise<EmailMessage> {
    const { credentials } = await this.mailboxes.resolveCredentials(workspaceId, mailboxId);
    const email = await this.jmap.getEmail(credentials, emailId);
    if (!email) throw new NotFoundException('Email não encontrado');
    return this.mapEmail(email);
  }

  async patch(workspaceId: string, emailId: string, patch: PatchMessageDto) {
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
      await this.jmap.patchEmail(credentials, emailId, { destroy: true });
      await this.auditMutation(workspaceId, 'mail.message.deleted', emailId);
      return { ok: true };
    }
    if (!Object.keys(keywords).length && !mailboxIds) {
      throw new BadRequestException('Nada para atualizar');
    }
    await this.jmap.patchEmail(credentials, emailId, { keywords, mailboxIds });
    await this.auditMutation(workspaceId, 'mail.message.patched', emailId, { keywords, mailboxIds });
    return { ok: true };
  }

  async send(
    workspaceId: string,
    actor: string,
    dto: SendMailDto,
  ): Promise<SendMailResult> {
    const { mailbox, credentials } = await this.mailboxes.resolveCredentials(
      workspaceId,
      dto.mailboxId,
    );

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
      this.log.log(
        `${c.green}📮${c.reset} ${c.magenta}${mailbox.address}${c.reset} → ${dto.to.join(',')} (${record.id})`,
      );
      return { id: record.id, status: OutgoingMessageStatus.SENT, createdAt: record.createdAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.outgoingMessage.update({
        where: { id: record.id },
        data: {
          status: OutgoingMessageStatus.FAILED,
          lastError: message,
          attempts: { increment: 1 },
        },
      });
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
