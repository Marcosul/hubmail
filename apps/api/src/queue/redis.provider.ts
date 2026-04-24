import { Logger } from '@nestjs/common';
import IORedis, { type Redis, type RedisOptions } from 'ioredis';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export function createRedisConnection(url: string | undefined): Redis | null {
  const log = new Logger('RedisConnection');
  if (!url) {
    log.warn(`${c.yellow}⚠️  REDIS_URL não definido — filas desligadas${c.reset}`);
    return null;
  }
  const opts: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  };
  const conn = new IORedis(url, opts);
  conn.on('connect', () => log.log(`${c.cyan}🔌 Redis conectado${c.reset}`));
  conn.on('ready', () => log.log(`${c.green}✅ Redis pronto${c.reset}`));
  conn.on('error', (err) => log.error(`${c.red}❌ Redis${c.reset} ${err.message}`));
  conn.on('close', () => log.warn(`${c.yellow}⚠️  Redis ligação fechada${c.reset}`));
  return conn;
}
