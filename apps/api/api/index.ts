import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createNestApp } from '../src/main';

let cached: Promise<NestFastifyApplication> | null = null;

async function getApp(): Promise<NestFastifyApplication> {
  if (!cached) {
    cached = (async () => {
      const app = await createNestApp();
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    })();
  }
  return cached;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getApp();
  const instance = app.getHttpAdapter().getInstance();
  instance.server.emit('request', req, res);
}
