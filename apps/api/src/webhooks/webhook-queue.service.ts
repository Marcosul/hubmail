import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WEBHOOK_EVENT_PUBLIC_NAME } from './webhook-events.constants';

export interface EmailEventJob {
  inboxId: string;
  emailId: string;
  emailExternalId?: string;
  from?: string;
  subject?: string;
  createdAt: Date;
}

/**
 * Redis-based queue system for webhook triggers.
 * Ensures no email events are lost and provides retry logic.
 */
@Injectable()
export class WebhookQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(WebhookQueueService.name);
  private queue: Queue<EmailEventJob>;
  private worker: Worker<EmailEventJob>;
  private queueEvents: QueueEvents;
  private redis: Redis;
  private jobProcessing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.log.warn('REDIS_URL not configured, webhook queue disabled');
      return;
    }

    try {
      this.redis = new Redis(redisUrl);
      await this.redis.ping();

      // Initialize queue
      this.queue = new Queue('webhook-email-events', {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // keep for 1 hour
          },
          removeOnFail: false, // keep failed jobs for debugging
        },
      });

      // Initialize queue events for monitoring
      this.queueEvents = new QueueEvents('webhook-email-events', {
        connection: this.redis,
      });

      // Initialize worker to process jobs
      this.worker = new Worker('webhook-email-events', this.processJob.bind(this), {
        connection: this.redis,
        concurrency: 5, // process up to 5 jobs in parallel
      });

      // Event listeners
      this.worker.on('completed', (job) => {
        if (job?.id) this.jobProcessing.delete(job.id);
        if (job?.id) this.log.debug(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        if (job?.id) this.jobProcessing.delete(job.id);
        if (job?.id) {
          this.log.error(
            `Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`,
          );
        }
      });

      this.log.log('✓ Webhook queue initialized with Redis');
    } catch (err) {
      this.log.error(
        `Failed to initialize webhook queue: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queueEvents) await this.queueEvents.close();
    if (this.redis) await this.redis.disconnect();
  }

  /**
   * Add an email event to the queue for webhook processing
   */
  async enqueueEmailEvent(data: EmailEventJob) {
    if (!this.queue) return;

    try {
      const jobId = `${data.inboxId}-${data.emailId}`;
      const job = await this.queue.add('trigger-webhooks', data, {
        jobId, // use deterministic ID to prevent duplicates
      });

      this.log.debug(`Email event queued: ${jobId} (job ${job.id})`);
      return job;
    } catch (err) {
      this.log.error(
        `Failed to queue email event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Process a webhook trigger job from the queue
   */
  private async processJob(job: any): Promise<void> {
    const jobId = job.id;
    const { inboxId, emailId, emailExternalId, from, subject, createdAt } =
      job.data as EmailEventJob;

    if (this.jobProcessing.has(jobId)) {
      this.log.debug(`Job ${jobId} already processing, skipping`);
      return;
    }

    this.jobProcessing.add(jobId);

    try {
      // Get all webhooks subscribed to MESSAGE_RECEIVED for this inbox
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          enabled: true,
          events: { has: 'MESSAGE_RECEIVED' },
          inboxIds: { has: inboxId },
        },
      });

      if (webhooks.length === 0) {
        this.log.debug(`No webhooks found for inbox ${inboxId}`);
        return;
      }

      this.log.log(`Processing ${webhooks.length} webhooks for email in ${inboxId}`);

      // Get inbox details
      const inbox = await this.prisma.mailbox.findUnique({
        where: { id: inboxId },
        select: { id: true, address: true },
      });

      if (!inbox) {
        this.log.error(`Inbox ${inboxId} not found`);
        return;
      }

      // Build AgentMail payload
      const payload = {
        event_id: `email-${emailExternalId || emailId}`,
        event_type: WEBHOOK_EVENT_PUBLIC_NAME['MESSAGE_RECEIVED'],
        type: 'event' as const,
        message: {
          from: from || null,
          subject: subject || '(sem assunto)',
          created_at: new Date(createdAt).toISOString(),
          inbox_id: inboxId,
          message_id: emailExternalId || emailId,
          thread_id: `thread_${emailId}`,
          to: [inbox.address],
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
          timestamp: new Date(createdAt).toISOString(),
          updated_at: new Date(createdAt).toISOString(),
        },
        thread: {
          thread_id: `thread_${emailId}`,
          subject: subject || '(sem assunto)',
          created_at: new Date(createdAt).toISOString(),
          inbox_id: inboxId,
          message_count: 1,
          senders: from ? [from] : [],
          recipients: [inbox.address],
          attachments: [],
          labels: ['Inbox'],
          last_message_id: emailExternalId || emailId,
          preview: null,
          received_timestamp: new Date(createdAt).toISOString(),
          sent_timestamp: new Date(createdAt).toISOString(),
          size: 0,
          timestamp: new Date(createdAt).toISOString(),
          updated_at: new Date(createdAt).toISOString(),
        },
      };

      // Dispatch to all webhooks
      for (const webhook of webhooks) {
        // Create webhook event record
        const event = await this.prisma.webhookEvent.create({
          data: {
            workspaceId: webhook.workspaceId,
            eventType: 'MESSAGE_RECEIVED',
            messageId: emailExternalId || emailId,
            payload: payload as never,
          },
        });

        // Dispatch with retry
        try {
          await this.dispatcher.deliverToWebhook(
            webhook.id,
            webhook.url,
            webhook.secret,
            event.id,
            payload,
          );

          this.log.log(
            `✓ Webhook ${webhook.id} fired for email ${emailId} → ${webhook.url}`,
          );
        } catch (err) {
          this.log.error(
            `Failed to dispatch webhook ${webhook.id}: ${
              err instanceof Error ? err.message : 'unknown'
            }`,
          );
          // Error is already recorded in database by dispatcher
        }
      }
    } finally {
      this.jobProcessing.delete(jobId);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.queue) return null;

    const counts = await this.queue.getJobCounts();
    const failed = await this.queue.getFailed(0, 10);
    const delayed = await this.queue.getDelayed(0, 10);

    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      failedJobs: failed.length,
      delayedJobs: delayed.length,
    };
  }

  /**
   * Clear failed jobs (use with caution)
   */
  async clearFailedJobs() {
    if (!this.queue) return;
    const removed = await this.queue.clean(0, 100, 'failed');
    this.log.log(`${removed.length} failed jobs cleared from queue`);
  }
}
