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
import { QUEUE_NAMES, type StalwartDomainProvisionJob } from './queue.names';
import { DomainsService } from '../domains/domains.service';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
};

/**
 * Provisiona domínios no Stalwart fora do pedido HTTP (BullMQ).
 * Escala a milhares de domínios: fila + retries + concurrencia limitada.
 */
@Injectable()
export class StalwartDomainProvisionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(StalwartDomainProvisionWorker.name);
  private worker?: Worker<StalwartDomainProvisionJob>;

  constructor(
    private readonly domains: DomainsService,
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
    if (!this.redis) {
      this.log.warn(
        `${c.yellow}⚠️  StalwartDomainProvisionWorker desligado (sem REDIS_URL)${c.reset}`,
      );
      return;
    }
    if (process.env.WORKERS_ENABLED !== 'true') {
      this.log.log(
        `${c.yellow}💤 StalwartDomainProvisionWorker dormente (WORKERS_ENABLED!=true)${c.reset}`,
      );
      return;
    }
    this.worker = new Worker<StalwartDomainProvisionJob>(
      QUEUE_NAMES.STALWART_DOMAIN_PROVISION,
      async (job) => this.handle(job),
      { connection: this.redis, concurrency: 2 },
    );

    this.worker.on('active', (job) =>
      this.log.log(
        `${c.cyan}🌐 StalwartDomain#${job.id} domainId=${job.data.domainId}${c.reset}`,
      ),
    );
    this.worker.on('completed', (job) =>
      this.log.log(`${c.green}✅ StalwartDomain#${job.id} concluído${c.reset}`),
    );
    this.worker.on('failed', (job, err) =>
      this.log.error(
        `${c.red}❌ StalwartDomain#${job?.id} falhou:${c.reset} ${err?.message ?? err}`,
      ),
    );
    this.log.log(`${c.magenta}👷 StalwartDomainProvisionWorker pronto (concurrency=2)${c.reset}`);
  }

  private async handle(job: Job<StalwartDomainProvisionJob>): Promise<void> {
    await this.domains.provisionStalwartForDomainJob(job.data);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
