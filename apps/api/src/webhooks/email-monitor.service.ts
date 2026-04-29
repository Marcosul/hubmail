import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookQueueService } from './webhook-queue.service';

/**
 * Monitors new emails in mailboxes that have webhooks subscribed
 * and adds them to the Redis queue for processing.
 */
@Injectable()
export class EmailMonitorService {
  private readonly log = new Logger(EmailMonitorService.name);
  private lastScanTime = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: WebhookQueueService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async scanForNewEmails() {
    try {
      // Get all inboxes that have webhooks subscribed to MESSAGE_RECEIVED
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          enabled: true,
          events: { has: 'MESSAGE_RECEIVED' },
        },
        distinct: ['inboxIds'],
      });

      const inboxIds = new Set<string>();
      for (const webhook of webhooks) {
        (webhook.inboxIds ?? []).forEach((id) => inboxIds.add(id));
      }

      // Scan each inbox for new emails
      for (const inboxId of inboxIds) {
        await this.checkInboxForNewEmails(inboxId);
      }
    } catch (err) {
      this.log.error(
        `Error scanning for new emails: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async checkInboxForNewEmails(inboxId: string) {
    const lastCheck = this.lastScanTime.get(inboxId) ?? Date.now() - 60000;
    const now = Date.now();

    try {
      // Find new emails in this inbox since last scan
      const newEmails = await this.prisma.$queryRaw<
        Array<{
          id: string;
          external_id: string | null;
          from: string | null;
          subject: string | null;
          created_at: Date;
        }>
      >`
        SELECT DISTINCT ON (m.id)
          m.id,
          m.external_id,
          m.from,
          m.subject,
          m.created_at
        FROM mailbox_messages m
        WHERE m.mailbox_id = ${inboxId}
          AND m.created_at > to_timestamp(${lastCheck / 1000})
          AND m.created_at <= to_timestamp(${now / 1000})
        ORDER BY m.id DESC, m.created_at DESC
        LIMIT 50
      `;

      if (newEmails.length > 0) {
        this.log.log(
          `📧 Found ${newEmails.length} new email(s) in inbox ${inboxId}`,
        );

        // Queue each email for webhook processing
        for (const email of newEmails) {
          await this.queueService.enqueueEmailEvent({
            inboxId,
            emailId: email.id,
            emailExternalId: email.external_id || undefined,
            from: email.from || undefined,
            subject: email.subject || undefined,
            createdAt: email.created_at,
          });
        }
      }

      this.lastScanTime.set(inboxId, now);
    } catch (err) {
      this.log.error(
        `Error checking inbox ${inboxId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
