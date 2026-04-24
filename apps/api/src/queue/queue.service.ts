import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS_CONNECTION } from './redis.provider';
import {
  QUEUE_NAMES,
  type MailIngestJob,
  type MailSendRetryJob,
  type QueueName,
  type WebhookDispatchJob,
} from './queue.names';

const c = {
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const DEFAULT_JOB_OPTS: JobsOptions = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly log = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, Queue>();

  constructor(
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {
    if (!redis) {
      this.log.warn(
        `${c.yellow}⚠️  QueueService em modo NO-OP (sem REDIS_URL)${c.reset}`,
      );
      return;
    }
    for (const name of Object.values(QUEUE_NAMES)) {
      const q = new Queue(name, { connection: redis, defaultJobOptions: DEFAULT_JOB_OPTS });
      this.queues.set(name, q);
      this.log.log(`${c.magenta}📮 Queue "${name}" inicializada${c.reset}`);
    }
  }

  private getQueue(name: QueueName): Queue | null {
    return this.queues.get(name) ?? null;
  }

  async enqueueMailIngest(payload: MailIngestJob, opts?: JobsOptions): Promise<void> {
    const q = this.getQueue(QUEUE_NAMES.MAIL_INGEST);
    if (!q) return;
    await q.add('ingest', payload, opts);
  }

  async enqueueMailSendRetry(payload: MailSendRetryJob, opts?: JobsOptions): Promise<void> {
    const q = this.getQueue(QUEUE_NAMES.MAIL_SEND_RETRY);
    if (!q) return;
    await q.add('retry', payload, opts);
  }

  async enqueueWebhookDispatch(
    payload: WebhookDispatchJob,
    opts?: JobsOptions,
  ): Promise<void> {
    const q = this.getQueue(QUEUE_NAMES.WEBHOOK_DISPATCH);
    if (!q) return;
    await q.add('dispatch', payload, opts);
  }

  isEnabled(): boolean {
    return this.queues.size > 0;
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) {
      await q.close();
    }
    this.queues.clear();
  }
}
