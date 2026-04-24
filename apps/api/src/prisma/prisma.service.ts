import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.log.log(`${c.green}🗄️  PrismaClient ligado ao Supabase ✨${c.reset}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.error(`${c.red}❌ Falha ao ligar ao Postgres:${c.reset} ${message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.log.log(`${c.yellow}🔌 PrismaClient desligado${c.reset}`);
  }

  /**
   * Executes a lightweight readiness check used by /api/health.
   */
  async isReady(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(`${c.yellow}⚠️  Postgres não responde:${c.reset} ${message}`);
      return false;
    }
  }
}
