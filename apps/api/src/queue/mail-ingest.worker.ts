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
import { REDIS_CONNECTION } from './redis.provider';
import { QUEUE_NAMES, type MailIngestJob } from './queue.names';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationsService } from '../automations/automations.service';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
};

@Injectable()
export class MailIngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MailIngestWorker.name);
  private worker?: Worker<MailIngestJob>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly automations: AutomationsService,
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
    if (!this.redis) {
      this.log.warn(
        `${c.yellow}⚠️  MailIngestWorker desligado (sem REDIS_URL)${c.reset}`,
      );
      return;
    }
    if (process.env.WORKERS_ENABLED !== 'true') {
      this.log.log(
        `${c.yellow}💤 MailIngestWorker dormente (WORKERS_ENABLED!=true)${c.reset}`,
      );
      return;
    }
    this.worker = new Worker<MailIngestJob>(
      QUEUE_NAMES.MAIL_INGEST,
      async (job) => this.handle(job),
      { connection: this.redis, concurrency: 4 },
    );

    this.worker.on('active', (job) =>
      this.log.log(
        `${c.cyan}🚚 Ingest#${job.id} a processar event=${job.data.eventId}${c.reset}`,
      ),
    );
    this.worker.on('completed', (job) =>
      this.log.log(`${c.green}✅ Ingest#${job.id} concluído${c.reset}`),
    );
    this.worker.on('failed', (job, err) =>
      this.log.error(
        `${c.red}❌ Ingest#${job?.id} falhou:${c.reset} ${err?.message ?? err}`,
      ),
    );
    this.log.log(`${c.magenta}👷 MailIngestWorker pronto${c.reset}`);
  }

  private async handle(job: Job<MailIngestJob>): Promise<void> {
    const { eventId, workspaceId } = job.data;
    const event = await this.prisma.inboxEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      this.log.warn(`${c.yellow}⚠️  InboxEvent ${eventId} não encontrado${c.reset}`);
      return;
    }
    if (event.processedAt) {
      this.log.log(
        `${c.cyan}↩️  Evento ${eventId} já processado (idempotente) — skip${c.reset}`,
      );
      return;
    }

    try {
      this.log.log(
        `${c.magenta}🤖 Workspace=${workspaceId} type=${event.type} a despachar automations…${c.reset}`,
      );
      await this.automations.runForEvent(eventId);
      await this.prisma.inboxEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.inboxEvent.update({
        where: { id: eventId },
        data: { error: message.slice(0, 500) },
      });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
