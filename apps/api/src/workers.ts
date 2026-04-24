import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/**
 * Ponto de entrada para correr os workers BullMQ num host long-running
 * (VPS / Docker / Railway). Não expõe HTTP. Exige `REDIS_URL` e força
 * `WORKERS_ENABLED=true`.
 */
async function bootstrap(): Promise<void> {
  process.env.WORKERS_ENABLED = 'true';
  const log = new Logger('Workers');

  if (!process.env.REDIS_URL) {
    log.error(
      `${c.red}❌ REDIS_URL em falta — não é possível arrancar workers${c.reset}`,
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  await app.init();

  log.log(`${c.green}✅ HubMail workers online (ingest · send · webhooks)${c.reset}`);
  log.log(`${c.cyan}🔌 Redis: ${process.env.REDIS_URL.replace(/:[^:@/]*@/, ':***@')}${c.reset}`);

  const shutdown = async (signal: string) => {
    log.warn(`${c.yellow}⚠️  ${signal} recebido — a encerrar workers${c.reset}`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`${c.red}💥 Workers crashed:${c.reset}`, err);
  process.exit(1);
});
