import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class DiagnosticController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('diagnostic')
  async getDiagnostics() {
    try {
      // 1. Find webhooks
      const webhooks = await this.prisma.webhook.findMany({
        where: { enabled: true },
        select: {
          id: true,
          url: true,
          enabled: true,
          events: true,
          inboxIds: true,
        },
      });

      // 2. Find inboxes with webhooks
      const inboxIds = new Set<string>();
      for (const webhook of webhooks) {
        (webhook.inboxIds ?? []).forEach((id) => inboxIds.add(id));
      }

      const inboxes = [];
      for (const inboxId of inboxIds) {
        const inbox = await this.prisma.mailbox.findUnique({
          where: { id: inboxId },
          select: { id: true, address: true },
        });
        if (inbox) {
          inboxes.push(inbox);
        }
      }

      // 3. Check for recent emails in webhook inboxes
      const emailsByInbox: Record<string, any[]> = {};
      for (const inboxId of inboxIds) {
        const emails = await this.prisma.mailbox_message.findMany({
          where: { mailbox_id: inboxId },
          orderBy: { created_at: 'desc' },
          take: 10,
          select: {
            id: true,
            external_id: true,
            from: true,
            subject: true,
            created_at: true,
          },
        });
        emailsByInbox[inboxId] = emails;
      }

      // 4. Check recent webhook events
      const webhookEvents = await this.prisma.webhookEvent.findMany({
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          eventType: true,
          messageId: true,
          created_at: true,
          status: true,
        },
      });

      return {
        status: 'ok',
        webhooks: {
          enabled: webhooks.length,
          list: webhooks,
        },
        inboxes: {
          total: inboxes.length,
          list: inboxes,
        },
        emails: emailsByInbox,
        webhookEvents: {
          total: webhookEvents.length,
          recent: webhookEvents,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
