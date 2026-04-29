import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WEBHOOK_EVENT_PUBLIC_NAME } from './webhook-events.constants';

/**
 * Monitors incoming emails and triggers webhooks since Stalwart
 * doesn't fire message-ingest.ham webhooks reliably.
 *
 * This is a workaround for Stalwart webhook limitations.
 */
@Injectable()
export class WebhookEmailTriggerService {
  private readonly log = new Logger(WebhookEmailTriggerService.name);
  private lastScanTime = new Map<string, number>();

  @Cron(CronExpression.EVERY_10_SECONDS)
  async scanForNewEmails() {
    try {
      // Get all webhooks subscribed to MESSAGE_RECEIVED
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          enabled: true,
          events: { has: 'MESSAGE_RECEIVED' },
        },
      });

      for (const webhook of webhooks) {
        if (!webhook.inboxIds?.length) continue;
        await this.checkInboxForNewEmails(webhook);
      }
    } catch (err) {
      this.log.error(
        `Webhook email trigger error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async checkInboxForNewEmails(webhook: any) {
    for (const inboxId of webhook.inboxIds) {
      const lastCheck = this.lastScanTime.get(inboxId) ?? Date.now() - 60000;
      const now = Date.now();

      try {
        // Find unprocessed emails (new ones) in this inbox
        const newEmails = await this.prisma.$queryRaw<any[]>`
          SELECT DISTINCT ON (m.id)
            m.id, m.external_id, m.subject, m.from, m.created_at
          FROM mailbox_messages m
          WHERE m.mailbox_id = ${inboxId}
            AND m.created_at > to_timestamp(${lastCheck / 1000})
            AND m.created_at <= to_timestamp(${now / 1000})
          ORDER BY m.id, m.created_at DESC
          LIMIT 20
        `;

        if (newEmails.length > 0) {
          this.log.log(
            `📧 Found ${newEmails.length} new email(s) in inbox ${inboxId}`,
          );

          for (const email of newEmails) {
            await this.triggerWebhookForEmail(webhook, email, inboxId);
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

  private async triggerWebhookForEmail(
    webhook: any,
    email: any,
    inboxId: string,
  ) {
    try {
      // Build AgentMail-style payload
      const payload = {
        event_id: `email-${email.external_id || email.id}`,
        event_type: WEBHOOK_EVENT_PUBLIC_NAME['MESSAGE_RECEIVED'],
        type: 'event' as const,
        message: {
          from: email.from || null,
          subject: email.subject || '(sem assunto)',
          created_at: email.created_at?.toISOString?.() || new Date().toISOString(),
          inbox_id: inboxId,
          message_id: email.external_id || email.id,
          thread_id: `thread_${email.id}`,
          to: [],
          attachments: [],
          bcc: [],
          cc: [],
          extracted_html: null,
          extracted_text: null,
          headers: {},
          html: null,
          in_reply_to: null,
          labels: ['Inbox'],
          preview: null,
          references: [],
          reply_to: [],
          size: 0,
          text: null,
          timestamp: email.created_at?.toISOString?.() || new Date().toISOString(),
          updated_at: email.created_at?.toISOString?.() || new Date().toISOString(),
        },
        thread: {
          thread_id: `thread_${email.id}`,
          subject: email.subject || '(sem assunto)',
          created_at: email.created_at?.toISOString?.() || new Date().toISOString(),
          inbox_id: inboxId,
          message_count: 1,
          senders: email.from ? [email.from] : [],
          recipients: [],
          attachments: [],
          labels: ['Inbox'],
          last_message_id: email.external_id || email.id,
          preview: null,
          received_timestamp: email.created_at?.toISOString?.() || new Date().toISOString(),
          sent_timestamp: email.created_at?.toISOString?.() || new Date().toISOString(),
          size: 0,
          timestamp: email.created_at?.toISOString?.() || new Date().toISOString(),
          updated_at: email.created_at?.toISOString?.() || new Date().toISOString(),
        },
      };

      // Create webhook event record
      const event = await this.prisma.webhookEvent.create({
        data: {
          workspaceId: webhook.workspaceId,
          eventType: 'MESSAGE_RECEIVED',
          messageId: email.external_id || email.id,
          payload: payload as never,
        },
      });

      // Dispatch webhook with retries
      void this.dispatcher
        .deliverToWebhook(
          webhook.id,
          webhook.url,
          webhook.secret,
          event.id,
          payload,
        )
        .catch((err) =>
          this.log.error(
            `Failed to dispatch webhook: ${
              err instanceof Error ? err.message : 'unknown'
            }`,
          ),
        );

      this.log.log(
        `✓ Webhook triggered for email ${email.id} → ${webhook.url}`,
      );
    } catch (err) {
      this.log.error(
        `Error triggering webhook for email ${email.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
