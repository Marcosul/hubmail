import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe (sempre 200 quando o processo está vivo)' })
  getHealth() {
    return {
      ok: true,
      service: 'hubmail-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HttpCode(200)
  @ApiOperation({ summary: 'Readiness probe (DB + dependências críticas)' })
  async getReady() {
    const dbReady = await this.prisma.isReady();
    const stalwartUrl = process.env.STALWART_JMAP_URL;
    let stalwartReady = true;
    if (stalwartUrl) {
      try {
        const res = await fetch(stalwartUrl, { method: 'GET' });
        stalwartReady = res.status < 500;
      } catch {
        stalwartReady = false;
      }
    }

    const ready = dbReady && stalwartReady;
    const payload = {
      ok: ready,
      db: dbReady,
      stalwart: stalwartReady,
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
