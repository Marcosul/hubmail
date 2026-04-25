import '../src/prisma-env-bridge';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  applyCorsForPreflight,
  applyCorsToNodeError,
  getCorsAllowList,
  getRequestOrigin,
} from '../src/cors-origins';
import { createNestApp } from '../src/main';

let cached: Promise<NestFastifyApplication> | null = null;
let processHandlersBound = false;

function bindProcessDiagnostics(): void {
  if (processHandlersBound) return;
  processHandlersBound = true;
  process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
    console.error('💥 uncaughtException (api/index.ts)', error);
  });
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('💥 unhandledRejection (api/index.ts)', reason);
  });
}

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
  bindProcessDiagnostics();
  const allowList = getCorsAllowList();
  const origin = getRequestOrigin(req);
  const method = req.method ?? 'GET';

  // Preflight antes de `getApp()`: se Prisma/Postgres falhar no init, o OPTIONS
  // ainda responde com CORS (evita "No Access-Control-Allow-Origin" enganador no browser).
  if (method === 'OPTIONS' && origin && allowList.includes(origin)) {
    applyCorsForPreflight(res, origin);
    return;
  }

  try {
    const app = await getApp();
    const instance = app.getHttpAdapter().getInstance();
    instance.server.emit('request', req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    applyCorsToNodeError(res, origin, allowList);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          message: 'Falha ao iniciar a API (ver Postgres/Supabase em Vercel).',
          detail: message,
        }),
      );
    }
  }
}
