import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { OutgoingMessageStatus, WebhookEventType } from '@prisma/client';
import { REDIS_CONNECTION } from './redis.provider';
import { QUEUE_NAMES, type MailSendRetryJob } from './queue.names';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxesService } from '../mail/mailboxes.service';
import { SmtpService } from '../mail/smtp.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

@Injectable()
export class MailSendRetryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MailSendRetryWorker.name);
  private worker?: Worker<MailSendRetryJob>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxes: MailboxesService,
    private readonly smtp: SmtpService,
    private readonly webhookDispatcher: WebhookDispatcherService,
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
    if (!this.redis) return;
    if (process.env.WORKERS_ENABLED !== 'true') {
      this.log.log(
        `${c.yellow}💤 MailSendRetryWorker dormente (WORKERS_ENABLED!=true)${c.reset}`,
      );
      return;
    }
    this.worker = new Worker<MailSendRetryJob>(
      QUEUE_NAMES.MAIL_SEND_RETRY,
      async (job) => this.handle(job),
      { connection: this.redis, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) =>
      this.log.error(
        `${c.red}❌ Mail retry#${job?.id} falhou:${c.reset} ${err?.message ?? err}`,
      ),
    );
    this.worker.on('completed', (job) =>
      this.log.log(`${c.green}✅ Retry#${job.id} concluído${c.reset}`),
    );
  }

  private async handle(job: Job<MailSendRetryJob>): Promise<void> {
    const { outgoingMessageId } = job.data;
    const msg = await this.prisma.outgoingMessage.findUnique({
      where: { id: outgoingMessageId },
    });
    if (!msg) {
      this.log.warn(`${c.yellow}⚠️  OutgoingMessage ${outgoingMessageId} inexistente${c.reset}`);
      return;
    }
    if (msg.status === OutgoingMessageStatus.SENT || msg.status === OutgoingMessageStatus.CANCELLED) {
      return;
    }
    this.log.log(`${c.cyan}🔁 A reenviar ${msg.id} (tentativa ${msg.attempts + 1})${c.reset}`);

    const { credentials } = await this.mailboxes.resolveCredentials(
      msg.workspaceId,
      msg.mailboxId,
    );
    try {
      await this.smtp.send(
        { user: credentials.username, pass: credentials.password },
        {
          from: msg.fromAddr,
          to: msg.toAddrs,
          cc: msg.ccAddrs,
          bcc: msg.bccAddrs,
          subject: msg.subject,
          html: msg.bodyHtml ?? undefined,
          text: msg.bodyText ?? undefined,
          inReplyTo: msg.inReplyTo ?? undefined,
          references: msg.references,
        },
      );
      await this.prisma.outgoingMessage.update({
        where: { id: msg.id },
        data: {
          status: OutgoingMessageStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      void this.webhookDispatcher
        .dispatch({
          workspaceId: msg.workspaceId,
          mailboxId: msg.mailboxId,
          eventType: WebhookEventType.MESSAGE_SENT,
          messageId: msg.id,
          payload: {
            send: {
              message_id: msg.id,
              inbox_id: msg.mailboxId,
              recipients: msg.toAddrs,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.outgoingMessage.update({
        where: { id: msg.id },
        data: {
          status: OutgoingMessageStatus.FAILED,
          lastError: message.slice(0, 500),
          attempts: { increment: 1 },
        },
      });
      void this.webhookDispatcher
        .dispatch({
          workspaceId: msg.workspaceId,
          mailboxId: msg.mailboxId,
          eventType: WebhookEventType.MESSAGE_REJECTED,
          messageId: msg.id,
          payload: {
            reject: {
              message_id: msg.id,
              inbox_id: msg.mailboxId,
              reason: message.slice(0, 500),
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch(() => {});
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
