import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxesService } from '../mail/mailboxes.service';
import { JmapClient } from '../mail/jmap.client';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

/**
 * Monitors new emails in mailboxes that have webhooks subscribed.
 *
 * Architecture:
 * - Emails are NOT stored in the API database; they live in Stalwart (JMAP).
 * - This service queries JMAP for recent emails per inbox.
 * - Idempotency: each detected email is recorded in `message_index` with a
 *   unique [mailboxId, jmapId] constraint. Insert succeeds → new email →
 *   dispatch webhook synchronously. Insert fails (P2002) → already seen.
 * - We dispatch DIRECTLY via WebhookDispatcherService (no BullMQ queue),
 *   because Vercel serverless functions don't keep BullMQ workers alive
 *   between invocations.
 *
 * Triggered via HTTP endpoint (Vercel Cron) — @Cron decorators don't run on
 * Vercel serverless functions either.
 */
@Injectable()
export class EmailMonitorService {
  private readonly log = new Logger(EmailMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxes: MailboxesService,
    private readonly jmap: JmapClient,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  async scanForNewEmails(): Promise<{
    inboxesScanned: number;
    newEmails: number;
    webhooksDispatched: number;
    errors: string[];
    details: Array<{
      inboxId: string;
      address?: string;
      jmapEmailsReturned: number;
      drafts: number;
      sent: number;
      alreadySeen: number;
      newEmails: number;
      dispatched: number;
    }>;
  }> {
    const errors: string[] = [];
    let newEmails = 0;
    let webhooksDispatched = 0;
    const inboxesScanned = new Set<string>();
    const details: Array<{
      inboxId: string;
      address?: string;
      jmapEmailsReturned: number;
      drafts: number;
      sent: number;
      alreadySeen: number;
      newEmails: number;
      dispatched: number;
    }> = [];

    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          enabled: true,
          events: { has: 'MESSAGE_RECEIVED' },
        },
      });

      this.log.log(`Found ${webhooks.length} enabled webhook(s) for MESSAGE_RECEIVED`);

      // Build map: inboxId -> workspaceId (so we can resolve credentials)
      const inboxToWorkspace = new Map<string, string>();

      for (const webhook of webhooks) {
        if (webhook.inboxIds && webhook.inboxIds.length > 0) {
          for (const inboxId of webhook.inboxIds) {
            inboxToWorkspace.set(inboxId, webhook.workspaceId);
          }
        } else if (webhook.workspaceIds && webhook.workspaceIds.length > 0) {
          const inboxes = await this.prisma.mailbox.findMany({
            where: { workspaceId: { in: webhook.workspaceIds } },
            select: { id: true, workspaceId: true },
          });
          for (const inbox of inboxes) {
            inboxToWorkspace.set(inbox.id, inbox.workspaceId);
          }
        } else {
          const inboxes = await this.prisma.mailbox.findMany({
            where: { workspaceId: webhook.workspaceId },
            select: { id: true, workspaceId: true },
          });
          for (const inbox of inboxes) {
            inboxToWorkspace.set(inbox.id, inbox.workspaceId);
          }
        }
      }

      for (const [inboxId, workspaceId] of inboxToWorkspace) {
        try {
          const detail = await this.checkInboxForNewEmails(workspaceId, inboxId);
          inboxesScanned.add(inboxId);
          newEmails += detail.newEmails;
          webhooksDispatched += detail.dispatched;
          details.push({ inboxId, ...detail });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`inbox ${inboxId}: ${message}`);
          this.log.error(`Error scanning inbox ${inboxId}: ${message}`);
          details.push({
            inboxId,
            jmapEmailsReturned: 0,
            drafts: 0,
            sent: 0,
            alreadySeen: 0,
            newEmails: 0,
            dispatched: 0,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`scan failed: ${message}`);
      this.log.error(`Scan failed: ${message}`);
    }

    this.log.log(
      `Scan complete: ${inboxesScanned.size} inbox(es), ${newEmails} new, ${webhooksDispatched} dispatched, ${errors.length} error(s)`,
    );

    return {
      inboxesScanned: inboxesScanned.size,
      newEmails,
      webhooksDispatched,
      errors,
      details,
    };
  }

  private async checkInboxForNewEmails(
    workspaceId: string,
    inboxId: string,
  ): Promise<{
    address?: string;
    jmapEmailsReturned: number;
    drafts: number;
    sent: number;
    alreadySeen: number;
    newEmails: number;
    dispatched: number;
  }> {
    const { mailbox, credentials } = await this.mailboxes.resolveCredentials(
      workspaceId,
      inboxId,
    );

    const result = await this.jmap.listThreads(credentials, {
      mailboxId: undefined,
      cursor: 0,
      limit: 50,
    });

    const stats = {
      address: mailbox.address,
      jmapEmailsReturned: result.emails?.length ?? 0,
      drafts: 0,
      sent: 0,
      alreadySeen: 0,
      newEmails: 0,
      dispatched: 0,
    };

    if (!result.emails || result.emails.length === 0) {
      return stats;
    }

    for (const email of result.emails) {
      if (email.keywords?.['$draft']) {
        stats.drafts += 1;
        continue;
      }
      if (email.keywords?.['$sent']) {
        stats.sent += 1;
        continue;
      }

      let isNew = false;
      try {
        await this.prisma.messageIndex.create({
          data: {
            mailboxId: inboxId,
            jmapId: email.id,
            threadId: email.threadId ?? null,
            subject: email.subject ?? null,
            fromAddr: email.from?.[0]?.email ?? null,
            receivedAt: new Date(email.receivedAt),
            snippet: email.preview ?? null,
            flags: Object.keys(email.keywords ?? {}),
          },
        });
        isNew = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.includes('Unique constraint') ||
          message.includes('P2002') ||
          message.includes('duplicate key')
        ) {
          stats.alreadySeen += 1;
          continue;
        }
        this.log.warn(
          `Failed to record email ${email.id} in ${inboxId}: ${message}`,
        );
        continue;
      }

      if (!isNew) continue;
      stats.newEmails += 1;

      this.log.log(
        `📧 New email in ${mailbox.address}: ${email.subject ?? '(no subject)'} (${email.id})`,
      );

      try {
        // Fetch full email (with attachments + bodies) for the payload
        const fullEmail = await this.jmap.getEmail(credentials, email.id);
        const sourceEmail = fullEmail ?? email;
        const attachments = await this.fetchAttachments(
          credentials,
          sourceEmail,
        );

        const recipients = inferRecipients(sourceEmail, mailbox.address);
        const payload = buildMessageReceivedPayload({
          email: sourceEmail,
          inboxId,
          inboxAddress: mailbox.address,
          recipients,
          attachments,
        });

        await this.dispatcher.dispatch({
          workspaceId,
          eventType: WebhookEventType.MESSAGE_RECEIVED,
          messageId: email.id,
          mailboxId: inboxId,
          payload,
        });
        stats.dispatched += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.error(
          `Failed to dispatch webhook for email ${email.id} in ${inboxId}: ${message}`,
        );
      }
    }

    return stats;
  }

  /**
   * Download attachments from JMAP and return them as base64 entries.
   * Skips attachments above MAX_INLINE_BYTES; the webhook receiver can
   * notice the missing payload via the `truncated: true` flag.
   */
  private async fetchAttachments(
    credentials: { username: string; password: string },
    email: {
      attachments?: Array<{
        blobId: string;
        name?: string;
        type?: string;
        size?: number;
        disposition?: string;
        cid?: string;
      }>;
    },
  ): Promise<WebhookAttachment[]> {
    const list = email.attachments ?? [];
    if (list.length === 0) return [];

    const out: WebhookAttachment[] = [];
    let idx = 0;
    for (const att of list) {
      idx += 1;
      const filename = att.name ?? `attachment-${idx}`;
      const mimetype = att.type ?? 'application/octet-stream';
      const size = att.size ?? 0;
      const fieldname = `attachment${idx}`;

      if (size > MAX_INLINE_BYTES) {
        out.push({
          attachment_id: att.blobId,
          fieldname,
          originalname: filename,
          filename,
          mimetype,
          size,
          truncated: true,
          reason: `Attachment exceeds ${MAX_INLINE_BYTES} bytes; not inlined`,
          content_id: att.cid ?? null,
          disposition: att.disposition ?? null,
        });
        continue;
      }

      try {
        const { stream, contentType } = await this.jmap.downloadBlob(
          credentials,
          att.blobId,
          { contentType: mimetype, name: filename },
        );
        const buffer = await readStreamToBuffer(stream);
        const actualMime = contentType || mimetype;
        const base64 = buffer.toString('base64');
        out.push({
          attachment_id: att.blobId,
          fieldname,
          originalname: filename,
          filename,
          mimetype: actualMime,
          size: buffer.length,
          base64: `data:${actualMime};base64,${base64}`,
          content_id: att.cid ?? null,
          disposition: att.disposition ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(
          `Failed to download attachment ${att.blobId} (${filename}): ${message}`,
        );
        out.push({
          attachment_id: att.blobId,
          fieldname,
          originalname: filename,
          filename,
          mimetype,
          size,
          error: message,
          content_id: att.cid ?? null,
          disposition: att.disposition ?? null,
        });
      }
    }
    return out;
  }
}

const MAX_INLINE_BYTES = 5 * 1024 * 1024; // 5 MB per attachment

interface WebhookAttachment {
  attachment_id: string;
  fieldname: string;
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  base64?: string;
  truncated?: boolean;
  reason?: string;
  error?: string;
  content_id?: string | null;
  disposition?: string | null;
}

async function readStreamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const buf = Buffer.alloc(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return buf;
}

function inferRecipients(
  email: { to?: Array<{ email: string }> | null },
  fallback: string,
): string[] {
  const list = (email.to ?? []).map((a) => a.email).filter(Boolean);
  return list.length > 0 ? list : [fallback];
}

function buildMessageReceivedPayload(args: {
  email: {
    id: string;
    threadId: string;
    subject?: string | null;
    preview?: string | null;
    from?: Array<{ email: string; name?: string | null }> | null;
    to?: Array<{ email: string }> | null;
    cc?: Array<{ email: string }> | null;
    bcc?: Array<{ email: string }> | null;
    replyTo?: Array<{ email: string }> | null;
    receivedAt: string;
    bodyValues?: Record<string, { value: string }>;
    htmlBody?: Array<{ partId?: string }>;
    textBody?: Array<{ partId?: string }>;
    inReplyTo?: string[] | null;
    references?: string[] | null;
    size?: number;
  };
  inboxId: string;
  inboxAddress: string;
  recipients: string[];
  attachments: WebhookAttachment[];
}): Record<string, unknown> {
  const { email, inboxId, inboxAddress, recipients, attachments } = args;
  const fromStr = email.from?.[0]
    ? formatAddress(email.from[0])
    : null;
  const ts = new Date(email.receivedAt).toISOString();
  const bodyValues = email.bodyValues ?? {};
  const htmlPart = email.htmlBody?.[0]?.partId;
  const textPart = email.textBody?.[0]?.partId;
  const html = htmlPart ? bodyValues[htmlPart]?.value ?? null : null;
  const text = textPart ? bodyValues[textPart]?.value ?? null : null;

  return {
    message: {
      message_id: email.id,
      thread_id: email.threadId,
      inbox_id: inboxId,
      from: fromStr,
      to: recipients,
      cc: (email.cc ?? []).map((a) => a.email),
      bcc: (email.bcc ?? []).map((a) => a.email),
      reply_to: (email.replyTo ?? []).map((a) => a.email),
      subject: email.subject ?? '',
      preview: email.preview ?? null,
      timestamp: ts,
      created_at: ts,
      updated_at: ts,
      labels: ['Inbox'],
      attachments,
      headers: {},
      html,
      text,
      extracted_html: html,
      extracted_text: text,
      in_reply_to: email.inReplyTo?.[0] ?? null,
      references: email.references ?? [],
      size: email.size ?? 0,
    },
    thread: {
      thread_id: email.threadId,
      subject: email.subject ?? '',
      inbox_id: inboxId,
      message_count: 1,
      senders: fromStr ? [fromStr] : [],
      recipients: [inboxAddress],
      timestamp: ts,
      created_at: ts,
      updated_at: ts,
      received_timestamp: ts,
      sent_timestamp: ts,
      last_message_id: email.id,
      preview: email.preview ?? null,
      labels: ['Inbox'],
      attachments: attachments.map((a) => ({
        attachment_id: a.attachment_id,
        filename: a.filename,
        mimetype: a.mimetype,
        size: a.size,
      })),
      size: email.size ?? 0,
    },
  };
}

function formatAddress(a: { email: string; name?: string | null }): string {
  return a.name ? `${a.name} <${a.email}>` : a.email;
}
