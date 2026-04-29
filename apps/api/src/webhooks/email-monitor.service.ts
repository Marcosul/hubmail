import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxesService } from '../mail/mailboxes.service';
import { JmapClient } from '../mail/jmap.client';
import { WebhookQueueService } from './webhook-queue.service';

/**
 * Monitors new emails in mailboxes that have webhooks subscribed.
 *
 * Architecture:
 * - Emails are NOT stored in the API database; they live in Stalwart (JMAP).
 * - This service queries JMAP for recent emails per inbox.
 * - Idempotency: each detected email is recorded in `message_index` with a
 *   unique [mailboxId, jmapId] constraint. If insert succeeds, the email is
 *   new and we enqueue the webhook event. If it already exists, skip.
 *
 * Triggered via HTTP endpoint (Vercel Cron) — @Cron decorators don't run on
 * Vercel serverless functions.
 */
@Injectable()
export class EmailMonitorService {
  private readonly log = new Logger(EmailMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxes: MailboxesService,
    private readonly jmap: JmapClient,
    private readonly queueService: WebhookQueueService,
  ) {}

  async scanForNewEmails(): Promise<{
    inboxesScanned: number;
    newEmails: number;
    errors: string[];
    details: Array<{
      inboxId: string;
      address?: string;
      jmapEmailsReturned: number;
      drafts: number;
      sent: number;
      alreadySeen: number;
      newEmails: number;
    }>;
  }> {
    const errors: string[] = [];
    let newEmails = 0;
    const inboxesScanned = new Set<string>();
    const details: Array<{
      inboxId: string;
      address?: string;
      jmapEmailsReturned: number;
      drafts: number;
      sent: number;
      alreadySeen: number;
      newEmails: number;
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
          // No specific scope -> all inboxes in webhook's workspace
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
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`scan failed: ${message}`);
      this.log.error(`Scan failed: ${message}`);
    }

    this.log.log(
      `Scan complete: ${inboxesScanned.size} inbox(es), ${newEmails} new email(s), ${errors.length} error(s)`,
    );

    return {
      inboxesScanned: inboxesScanned.size,
      newEmails,
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
  }> {
    const { mailbox, credentials } = await this.mailboxes.resolveCredentials(
      workspaceId,
      inboxId,
    );

    // Query recent emails from JMAP (most recent first, top 50)
    const result = await this.jmap.listThreads(credentials, {
      mailboxId: undefined, // all folders within this account
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

        await this.queueService.enqueueEmailEvent({
          inboxId,
          emailId: email.id,
          emailExternalId: email.id,
          from: email.from?.[0]?.email ?? undefined,
          subject: email.subject ?? undefined,
          createdAt: new Date(email.receivedAt),
        });

        stats.newEmails += 1;
        this.log.log(
          `📧 New email in ${mailbox.address}: ${email.subject ?? '(no subject)'} (${email.id})`,
        );
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
      }
    }

    return stats;
  }
}
