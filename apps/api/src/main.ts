import './prisma-env-bridge';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getCorsAllowList } from './cors-origins';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

/**
 * Cria e configura a aplicação Nest sobre Fastify, sem chamar `listen`.
 * É usado tanto pelo bootstrap tradicional (servidor longo) como pelo
 * handler serverless da Vercel (`apps/api/api/index.ts`).
 */
export async function createNestApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { rawBody: true, bufferLogs: true },
  );

  app.setGlobalPrefix('api');

  const fastify = app.getHttpAdapter().getInstance();
  fastify.get('/', async (_req, reply) => {
    return reply.status(200).type('application/json').send({
      message:
        'HubMail API. Raiz: Swagger em /docs, saúde em /api/health, auth em /api/auth/*.',
      docs: '/docs',
      health: '/api/health',
      auth: '/api/auth',
    });
  });

  const origins = getCorsAllowList();
  app.enableCors({
    // Callback: com `credentials: true` o preflight tem de reflectir o `Origin` exacto
    // (p.ex. `https://www.hubmail.to`); a lista de strings por vezes falha no Fastify+serverless.
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (origins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Workspace-Id',
      'X-Requested-With',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  if (process.env.SWAGGER_DISABLED !== 'true') {
    const config = new DocumentBuilder()
      .setTitle('HubMail API')
      .setDescription('Webmail + automações + agentes')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createNestApp();
  const host = '0.0.0.0';
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port, host);

  console.log(`${colors.green}✅ HubMail API online na porta ${port}${colors.reset}`);
  console.log(`${colors.cyan}🩺 Health: /api/health${colors.reset}`);
  console.log(`${colors.yellow}🔐 Auth: /api/auth/login, /api/auth/google, /api/auth/me${colors.reset}`);
  console.log(`${colors.magenta}📚 Swagger: /docs${colors.reset}`);
}

// Só inicia o servidor HTTP se o ficheiro for o entrypoint (dev / VPS).
if (require.main === module) {
  bootstrap();
}
