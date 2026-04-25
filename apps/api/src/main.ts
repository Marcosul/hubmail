import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:3010'];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

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

  const appOrigins = parseOrigins(process.env.APP_URL);
  const extraOrigins = process.env.CORS_ORIGINS ? parseOrigins(process.env.CORS_ORIGINS) : [];
  const origins = [...new Set([...appOrigins, ...extraOrigins])];
  app.enableCors({
    origin: origins.length === 1 ? origins[0]! : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
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
