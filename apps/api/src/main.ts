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

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('api');

  const fastify = app.getHttpAdapter().getInstance();
  fastify.get('/', async (_req, reply) => {
    console.log(
      `${colors.magenta}📬 GET / — HubMail API (use /docs e /api/health) ✨${colors.reset}`,
    );
    return reply.status(200).type('application/json').send({
      message:
        'HubMail API. Raiz: Swagger em /docs, saúde em /api/health, auth em /api/auth/*.',
      docs: '/docs',
      health: '/api/health',
      auth: '/api/auth',
    });
  });

  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3010',
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('HubMail API')
    .setDescription('Auth por email e Google (Supabase Auth)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const host = '0.0.0.0';
  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port, host);

  console.log(`${colors.green}✅ HubMail API online na porta ${port}${colors.reset}`);
  console.log(`${colors.cyan}🩺 Health: /api/health${colors.reset}`);
  console.log(`${colors.yellow}🔐 Auth: /api/auth/login, /api/auth/google, /api/auth/me${colors.reset}`);
  console.log(`${colors.cyan}📚 Swagger: /docs${colors.reset}`);
}

bootstrap();
