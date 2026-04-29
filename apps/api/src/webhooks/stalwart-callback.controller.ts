import { Body, Controller, HttpCode, Logger, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WEBHOOK_EVENT_PUBLIC_NAME } from './webhook-events.constants';

/**
 * Mapeia typeId nativo do Stalwart para o nosso enum de webhook hubmail.
 * Mantém-se sincronizado com STALWART_EVENT_MAP em stalwart-webhooks.helper.ts.
 */
const STALWART_TO_HUBMAIL: Record<string, WebhookEventType> = {
  'message-ingest.ham': 'MESSAGE_RECEIVED',
  'message-ingest.error': 'MESSAGE_RECEIVED_BLOCKED',
  'message-ingest.spam': 'MESSAGE_RECEIVED_SPAM',
  'delivery.completed': 'MESSAGE_SENT',
  'delivery.delivered': 'MESSAGE_DELIVERED',
  'delivery.failed': 'MESSAGE_BOUNCED',
  'incoming-report.dmarc-report': 'MESSAGE_COMPLAINED',
  'delivery.message-rejected': 'MESSAGE_REJECTED',
};

interface StalwartEvent {
  id?: string | number;
  typeId?: string;
  type?: string;
  createdAt?: string | number;
  messageId?: string;
  'message-id'?: string;
  to?: string;
  recipient?: string;
  recipients?: string[];
  from?: string;
  subject?: string;
  size?: number;
  [k: string]: unknown;
}

type StalwartPayload = { events?: StalwartEvent[] } & StalwartEvent;

function isoDate(d: Date): string {
  return d.toISOString().replace(/Z$/, '');
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Constrói payload AgentMail-style a partir de um evento Stalwart.
 * Campos não disponíveis no evento ficam vazios/null para preservar o
 * shape esperado pela integração do usuário.
 */
function buildAgentmailPayload(
  evt: StalwartEvent,
  inbox: { id: string; address: string } | null,
): Record<string, unknown> {
  const messageId =
    (typeof evt.messageId === 'string' && evt.messageId) ||
    (typeof evt['message-id'] === 'string' && (evt['message-id'] as string)) ||
    (typeof evt.id !== 'undefined' && String(evt.id)) ||
    `stalwart-${Date.now()}`;

  const ts = isoDate(
    typeof evt.createdAt === 'string'
      ? new Date(evt.createdAt)
      : typeof evt.createdAt === 'number'
        ? new Date(evt.createdAt * 1000)
        : new Date(),
  );

  const recipients = [
    ...toArray(evt.to as string | string[]),
    ...toArray(evt.recipient as string | string[]),
    ...toArray(evt.recipients),
  ].filter((s): s is string => typeof s === 'string' && s.length > 0);

  const message = {
    attachments: [],
    bcc: [],
    cc: [],
    created_at: ts,
    extracted_html: null,
    extracted_text: null,
    from: typeof evt.from === 'string' ? evt.from : null,
    headers: {},
    html: null,
    in_reply_to: null,
    inbox_id: inbox?.id ?? null,
    labels: ['Inbox'],
    message_id: String(messageId),
    preview: null,
    references: [],
    reply_to: [],
    size: typeof evt.size === 'number' ? evt.size : 0,
    subject: typeof evt.subject === 'string' ? evt.subject : null,
    text: null,
    thread_id: `thread_${messageId}`,
    timestamp: ts,
    to: recipients.length > 0 ? recipients : inbox ? [inbox.address] : [],
    updated_at: ts,
  };

  const thread = {
    attachments: [],
    created_at: ts,
    inbox_id: inbox?.id ?? null,
    labels: ['Inbox'],
    last_message_id: String(messageId),
    message_count: 1,
    preview: null,
    received_timestamp: ts,
    recipients: message.to,
    senders: message.from ? [message.from] : [],
    sent_timestamp: ts,
    size: message.size,
    subject: message.subject,
    thread_id: message.thread_id,
    timestamp: ts,
    updated_at: ts,
  };

  return { message, thread };
}

@ApiTags('webhooks')
@Controller('webhooks/stalwart')
export class StalwartCallbackController {
  private readonly log = new Logger(StalwartCallbackController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  @Post(':webhookId')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Callback do Stalwart — recebe events[] e re-dispatcha em formato AgentMail para a URL final do usuário com retries.',
  })
  async callback(
    @Param('webhookId') webhookId: string,
    @Body() payload: StalwartPayload,
  ): Promise<{ ok: boolean; dispatched: number }> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || !webhook.enabled) {
      this.log.warn(`stalwart callback ignorado (webhook desconhecido/desabilitado): ${webhookId}`);
      return { ok: true, dispatched: 0 };
    }

    const events: StalwartEvent[] = Array.isArray(payload?.events)
      ? (payload.events as StalwartEvent[])
      : [payload as StalwartEvent];

    let dispatched = 0;
    for (const evt of events) {
      const stalwartTypeId = (evt.typeId ?? evt.type ?? '').toString();
      const eventType = STALWART_TO_HUBMAIL[stalwartTypeId];
      if (!eventType) continue;

      // Filtro: só dispara se este webhook está inscrito neste evento.
      if (webhook.events.length > 0 && !webhook.events.includes(eventType)) {
        continue;
      }

      // Resolve mailbox pelo destinatário (se for um endereço local).
      const recipient =
        typeof evt.to === 'string'
          ? evt.to
          : typeof evt.recipient === 'string'
            ? evt.recipient
            : Array.isArray(evt.recipients) && typeof evt.recipients[0] === 'string'
              ? evt.recipients[0]
              : null;

      let inbox: { id: string; address: string } | null = null;
      if (recipient && recipient.includes('@')) {
        const m = await this.prisma.mailbox.findFirst({
          where: { workspaceId: webhook.workspaceId, address: recipient.toLowerCase() },
          select: { id: true, address: true },
        });
        if (m) inbox = m;
      }

      // Filtro: se o webhook tem inboxIds, só dispara se o evento pertence a um deles.
      if (webhook.inboxIds.length > 0) {
        if (!inbox || !webhook.inboxIds.includes(inbox.id)) continue;
      }

      const messageId =
        (typeof evt.messageId === 'string' && evt.messageId) ||
        (typeof evt['message-id'] === 'string' && (evt['message-id'] as string)) ||
        (typeof evt.id !== 'undefined' && String(evt.id)) ||
        null;

      const agentmailBody = buildAgentmailPayload(evt, inbox);

      const eventRow = await this.prisma.webhookEvent.create({
        data: {
          workspaceId: webhook.workspaceId,
          eventType,
          messageId,
          payload: agentmailBody as never,
        },
      });

      const fullPayload = {
        event_id: eventRow.id,
        event_type: WEBHOOK_EVENT_PUBLIC_NAME[eventType],
        type: 'event' as const,
        ...agentmailBody,
      };

      void this.dispatcher
        .deliverToWebhook(webhook.id, webhook.url, webhook.secret, eventRow.id, fullPayload)
        .catch((err) =>
          this.log.error(
            `Falha ao re-dispatchar webhook ${webhook.id}: ${
              err instanceof Error ? err.message : 'unknown'
            }`,
          ),
        );
      dispatched += 1;
    }

    return { ok: true, dispatched };
  }
}
