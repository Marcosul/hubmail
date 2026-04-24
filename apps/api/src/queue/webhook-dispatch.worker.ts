import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS_CONNECTION } from './redis.provider';
import { QUEUE_NAMES, type WebhookDispatchJob } from './queue.names';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

@Injectable()
export class WebhookDispatchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(WebhookDispatchWorker.name);
  private worker?: Worker<WebhookDispatchJob>;

  constructor(
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
    if (!this.redis) return;
    if (process.env.WORKERS_ENABLED !== 'true') {
      this.log.log(
        `${c.yellow}💤 WebhookDispatchWorker dormente (WORKERS_ENABLED!=true)${c.reset}`,
      );
      return;
    }

    this.worker = new Worker<WebhookDispatchJob>(
      QUEUE_NAMES.WEBHOOK_DISPATCH,
      async (job) => this.handle(job),
      { connection: this.redis, concurrency: 8 },
    );

    this.worker.on('active', (job) =>
      this.log.log(
        `${c.cyan}📡 Webhook#${job.id} → ${job.data.url}${c.reset}`,
      ),
    );
    this.worker.on('completed', (job) =>
      this.log.log(`${c.green}✅ Webhook#${job.id} OK${c.reset}`),
    );
    this.worker.on('failed', (job, err) =>
      this.log.error(
        `${c.red}❌ Webhook#${job?.id} falhou:${c.reset} ${err?.message ?? err}`,
      ),
    );
  }

  private async handle(job: Job<WebhookDispatchJob>): Promise<void> {
    const { url, secret, payload } = job.data;
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HubMail-Webhook/1.0',
    };
    if (secret) {
      const sig = createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Signature-256'] = `sha256=${sig}`;
    }
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Webhook ${url} retornou ${res.status}: ${text.slice(0, 200)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
