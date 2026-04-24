import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InboxEventType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { WebhookSignatureService } from './webhook-signature.service';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/**
 * Formato oficial do Stalwart (https://stalw.art/docs/telemetry/webhooks/):
 * { events: [ { id, typeId, createdAt, ...data } ] }
 *
 * Para compatibilidade mantemos também o formato "plano" (event único) caso
 * algum integrador envie apenas um objecto com `type/messageId` no topo.
 */
type StalwartEvent = {
  id?: number | string;
  typeId?: string;
  type?: string;
  event?: string;
  createdAt?: string | number;
  messageId?: string;
  'message-id'?: string;
  to?: string;
  recipient?: string;
  from?: string;
  subject?: string;
  [key: string]: unknown;
};

type StalwartPayload =
  | { events: StalwartEvent[] }
  | StalwartEvent;

function resolveEventType(raw: string | undefined): InboxEventType {
  const n = (raw ?? '').toLowerCase();

  // Mapeia os typeIds oficiais do Stalwart.
  if (n.includes('bounce') || n.includes('dmarc-reject') || n.includes('spf-fail')) {
    return InboxEventType.BOUNCED;
  }
  if (n.includes('spam')) return InboxEventType.SPAM;
  if (n.includes('message-ingest.ham') || n.includes('inbound') || n.includes('receive')) {
    return InboxEventType.RECEIVED;
  }
  if (n.includes('deliver') || n.includes('delivery.success')) {
    return InboxEventType.DELIVERED;
  }
  return InboxEventType.OTHER;
}

function extractEvents(payload: StalwartPayload): StalwartEvent[] {
  if (payload && typeof payload === 'object' && Array.isArray((payload as { events?: unknown[] }).events)) {
    return (payload as { events: StalwartEvent[] }).events;
  }
  return [payload as StalwartEvent];
}

@ApiTags('webhooks')
@Controller('webhooks/mail')
export class MailWebhooksController {
  private readonly log = new Logger(MailWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly signatures: WebhookSignatureService,
    private readonly config: ConfigService,
  ) {}

  @Post('ingest/:domain')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Recebe eventos do Stalwart (events[].typeId) e enfileira para processamento',
  })
  async ingest(
    @Param('domain') domain: string,
    @Headers('x-signature-256') signature256: string | undefined,
    @Headers('x-signature') signatureLegacy: string | undefined,
    @Headers('x-hub-domain') headerHubDomain: string | undefined,
    @Req() req: { rawBody?: Buffer },
    @Body() payload: StalwartPayload,
  ) {
    if (!domain?.trim()) {
      throw new BadRequestException('Domain obrigatório');
    }

    const domainEntity = await this.prisma.domain.findFirst({
      where: { name: domain.toLowerCase() },
    });
    if (!domainEntity) {
      this.log.warn(
        `${c.yellow}⚠️  Webhook recebido para domínio desconhecido: ${domain}${c.reset}`,
      );
      throw new NotFoundException(`Domain ${domain} não registado`);
    }

    const secret =
      domainEntity.webhookSecret ??
      this.config.get<string>('WEBHOOK_DEFAULT_SECRET')?.trim() ??
      null;
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(payload ?? {});
    const signature = signature256 ?? signatureLegacy;

    if (secret) {
      const ok = this.signatures.verify(secret, rawBody, signature);
      if (!ok) {
        this.log.warn(
          `${c.red}❌ HMAC inválido para ${domain} (sig=${signature?.slice(0, 20)}…)${c.reset}`,
        );
        throw new UnauthorizedException('Assinatura HMAC inválida');
      }
    } else {
      this.log.warn(
        `${c.yellow}⚠️  Domain ${domain} sem segredo HMAC — aceite em modo inseguro${c.reset}`,
      );
    }

    if (headerHubDomain && headerHubDomain.toLowerCase() !== domain.toLowerCase()) {
      this.log.warn(
        `${c.yellow}⚠️  X-Hub-Domain=${headerHubDomain} difere da URL (${domain})${c.reset}`,
      );
    }

    const events = extractEvents(payload);
    if (!events.length) {
      this.log.warn(`${c.yellow}⚠️  Payload sem events[] para ${domain}${c.reset}`);
      return { ok: true, accepted: 0, deduplicated: 0 };
    }

    let accepted = 0;
    let deduplicated = 0;

    for (const evt of events) {
      const messageId =
        (typeof evt.messageId === 'string' && evt.messageId) ||
        (typeof evt['message-id'] === 'string' && (evt['message-id'] as string)) ||
        (typeof evt.id !== 'undefined' && String(evt.id)) ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const type = resolveEventType(evt.typeId ?? evt.type ?? evt.event);

      let mailboxId: string | null = null;
      const recipient = typeof evt.to === 'string' ? evt.to : evt.recipient;
      if (typeof recipient === 'string' && recipient.includes('@')) {
        const mailbox = await this.prisma.mailbox.findFirst({
          where: {
            workspaceId: domainEntity.workspaceId,
            address: recipient.toLowerCase(),
          },
          select: { id: true },
        });
        mailboxId = mailbox?.id ?? null;
      }

      try {
        const created = await this.prisma.inboxEvent.create({
          data: {
            workspaceId: domainEntity.workspaceId,
            domainId: domainEntity.id,
            mailboxId,
            messageId: String(messageId),
            type,
            payload: evt as never,
            signature: signature ?? null,
          },
          select: { id: true },
        });
        await this.queue.enqueueMailIngest({
          eventId: created.id,
          workspaceId: domainEntity.workspaceId,
        });
        accepted += 1;
        this.log.log(
          `${c.green}📥 Evento ${type} (${evt.typeId ?? 'raw'}) aceite ${created.id} @ ${domain}${c.reset}`,
        );
      } catch (error) {
        const err = error as { code?: string };
        if (err.code === 'P2002') {
          deduplicated += 1;
          this.log.log(
            `${c.cyan}↩️  Evento ${messageId}/${type} duplicado — idempotência${c.reset}`,
          );
          continue;
        }
        throw error;
      }
    }

    return { ok: true, accepted, deduplicated };
  }
}
