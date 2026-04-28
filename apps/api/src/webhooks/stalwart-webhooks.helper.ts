import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JmapClient, type JmapCredentials } from '../mail/jmap.client';
import { WebhookEventType } from '@prisma/client';

/**
 * Mapeia o nosso enum para os event types nativos do Stalwart
 * (https://stalw.art/docs/ref/events/). Stalwart enviará apenas estes
 * tipos para a URL configurada (eventsPolicy=include).
 *
 * DOMAIN_VERIFIED não tem equivalente — é disparado pela própria API
 * hubmail e não pelo Stalwart.
 */
const STALWART_EVENT_MAP: Record<WebhookEventType, string[]> = {
  DOMAIN_VERIFIED: [],
  MESSAGE_RECEIVED: ['message-ingest.ham'],
  MESSAGE_RECEIVED_BLOCKED: ['message-ingest.error'],
  MESSAGE_RECEIVED_SPAM: ['message-ingest.spam'],
  MESSAGE_SENT: ['delivery.completed'],
  MESSAGE_DELIVERED: ['delivery.delivered'],
  MESSAGE_BOUNCED: ['delivery.failed'],
  MESSAGE_COMPLAINED: ['incoming-report.dmarc-report'],
  MESSAGE_REJECTED: ['delivery.message-rejected'],
};

/**
 * Stalwart usa um Map<EventId, true> para o campo `events`. Convertemos a lista
 * de eventos do hubmail para esse formato, mantendo apenas os eventos que têm
 * equivalente nativo (eventos sem mapeamento são tratados internamente).
 */
function mapEvents(events: WebhookEventType[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of events) {
    for (const s of STALWART_EVENT_MAP[e] ?? []) out[s] = true;
  }
  return out;
}

interface UpsertInput {
  url: string;
  signatureKey: string;
  events: WebhookEventType[];
  enabled: boolean;
  description?: string | null;
}

@Injectable()
export class StalwartWebhooksAdapter {
  private readonly log = new Logger(StalwartWebhooksAdapter.name);

  constructor(
    private readonly jmap: JmapClient,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.creds());
  }

  /** Cria webhook no Stalwart; retorna `stalwartId` ou null se não configurado/falhou. */
  async create(input: UpsertInput): Promise<string | null> {
    const creds = this.creds();
    if (!creds) return null;

    const createKey = 'hubmailWebhook';
    const stalwartEvents = mapEvents(input.events);
    try {
      const res = await this.jmap.invokeStalwartManagement(creds, [
        [
          'x:WebHook/set',
          {
            create: {
              [createKey]: {
                url: input.url,
                signatureKey: { '@type': 'Value', secret: input.signatureKey },
                httpAuth: { '@type': 'Unauthenticated' },
                events: stalwartEvents,
                eventsPolicy: 'include',
                enable: input.enabled,
              },
            },
          },
          'wh1',
        ],
      ]);
      this.log.debug(`Resposta JMAP: ${JSON.stringify(res)}`);
      const payload = res.find((r) => r[0] === 'x:WebHook/set')?.[1] as
        | {
            created?: Record<string, { id?: string } | string>;
            notCreated?: Record<string, { type?: string; description?: string }>;
          }
        | undefined;
      this.log.debug(`Payload JMAP: ${JSON.stringify(payload)}`);
      const entry = payload?.created?.[createKey];
      const id = typeof entry === 'string' ? entry : entry?.id;
      if (id) {
        this.log.log(`\x1b[32m🪝\x1b[0m Stalwart WebHook criado (id ${id}) → ${input.url}`);
        return id;
      }
      const err = this.firstError(payload?.notCreated);
      this.log.warn(
        `Stalwart x:WebHook/set não criou webhook${err ? `: ${err}` : ''}. Resposta: ${JSON.stringify(
          payload,
        )}`,
      );
      return null;
    } catch (e) {
      this.log.error(
        `Falha ao criar webhook no Stalwart: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  async update(stalwartId: string, input: UpsertInput): Promise<boolean> {
    const creds = this.creds();
    if (!creds) return false;
    const stalwartEvents = mapEvents(input.events);
    try {
      const res = await this.jmap.invokeStalwartManagement(creds, [
        [
          'x:WebHook/set',
          {
            update: {
              [stalwartId]: {
                url: input.url,
                signatureKey: { '@type': 'Value', secret: input.signatureKey },
                events: stalwartEvents,
                eventsPolicy: 'include',
                enable: input.enabled,
              },
            },
          },
          'wh-u1',
        ],
      ]);
      const payload = res.find((r) => r[0] === 'x:WebHook/set')?.[1] as
        | {
            updated?: Record<string, unknown>;
            notUpdated?: Record<string, { type?: string; description?: string }>;
          }
        | undefined;
      if (payload?.updated && stalwartId in payload.updated) return true;
      const err = this.firstError(payload?.notUpdated);
      this.log.warn(`Stalwart x:WebHook/set não atualizou ${stalwartId}${err ? `: ${err}` : ''}`);
      return false;
    } catch (e) {
      this.log.error(
        `Falha ao atualizar webhook ${stalwartId} no Stalwart: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return false;
    }
  }

  async destroy(stalwartId: string): Promise<boolean> {
    const creds = this.creds();
    if (!creds) return false;
    try {
      const res = await this.jmap.invokeStalwartManagement(creds, [
        ['x:WebHook/set', { destroy: [stalwartId] }, 'wh-d1'],
      ]);
      const payload = res.find((r) => r[0] === 'x:WebHook/set')?.[1] as
        | { destroyed?: string[]; notDestroyed?: Record<string, { type?: string; description?: string }> }
        | undefined;
      if (payload?.destroyed?.includes(stalwartId)) {
        this.log.log(`\x1b[31m🗑️\x1b[0m Stalwart WebHook ${stalwartId} removido`);
        return true;
      }
      const err = this.firstError(payload?.notDestroyed);
      this.log.warn(`Stalwart x:WebHook/set não destruiu ${stalwartId}${err ? `: ${err}` : ''}`);
      return false;
    } catch (e) {
      this.log.error(
        `Falha ao remover webhook ${stalwartId} no Stalwart: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return false;
    }
  }

  private creds(): JmapCredentials | null {
    const username = this.config.get<string>('STALWART_MANAGEMENT_EMAIL')?.trim();
    const password = this.config.get<string>('STALWART_MANAGEMENT_PASSWORD')?.trim();
    if (!username || !password) return null;
    return { username, password };
  }

  private firstError(
    map?: Record<string, { type?: string; description?: string }>,
  ): string | undefined {
    if (!map) return undefined;
    const v = Object.values(map)[0];
    return v?.description ?? v?.type;
  }
}
