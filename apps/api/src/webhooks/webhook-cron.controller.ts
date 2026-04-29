import { Controller, Get, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailMonitorService } from './email-monitor.service';

/**
 * Endpoints triggered by Vercel Cron Jobs.
 *
 * Vercel Cron sends a request with header `Authorization: Bearer <CRON_SECRET>`
 * to authenticate. The secret must match the `CRON_SECRET` env var.
 */
@ApiTags('webhooks')
@Controller('webhooks/cron')
export class WebhookCronController {
  private readonly log = new Logger(WebhookCronController.name);

  constructor(
    private readonly emailMonitor: EmailMonitorService,
    private readonly config: ConfigService,
  ) {}

  @Get('scan-emails')
  @ApiOperation({
    summary: 'Scan inboxes for new emails and trigger MESSAGE_RECEIVED webhooks',
    description:
      'Called by Vercel Cron Jobs every minute. Authenticated via CRON_SECRET bearer token.',
  })
  async scanEmails(@Headers('authorization') authHeader?: string) {
    this.assertAuthorized(authHeader);

    const start = Date.now();
    const result = await this.emailMonitor.scanForNewEmails();
    const elapsedMs = Date.now() - start;

    this.log.log(
      `Cron scan-emails finished: ${result.inboxesScanned} inbox(es), ${result.newEmails} new email(s), ${result.errors.length} error(s) in ${elapsedMs}ms`,
    );

    return {
      ok: true,
      ...result,
      elapsedMs,
    };
  }

  private assertAuthorized(authHeader?: string): void {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected) {
      // If no secret is configured, allow only in non-production environments.
      const env = this.config.get<string>('NODE_ENV') ?? 'development';
      if (env === 'production') {
        throw new UnauthorizedException('CRON_SECRET not configured');
      }
      return;
    }
    const expectedHeader = `Bearer ${expected}`;
    if (authHeader !== expectedHeader) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }
}
