import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { WebhookAttemptStatus, WebhookEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WEBHOOK_EVENT_PUBLIC_NAME } from './webhook-events.constants';

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = Number(process.env.WEBHOOKS_REQUEST_TIMEOUT_MS ?? 30_000);
const MAX_RESPONSE_BODY_CHARS = 1900;
const ALLOW_PRIVATE_TARGETS = process.env.WEBHOOKS_ALLOW_PRIVATE_TARGETS === 'true';

/**
 * Bloqueia destinos privados/internos para evitar SSRF (loopback, link-local,
 * RFC1918, metadata cloud). Pode ser desligado via WEBHOOKS_ALLOW_PRIVATE_TARGETS=true
 * em ambientes de teste.
 */
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const fam = isIP(h);
  if (!fam) return false;
  if (fam === 4) {
    const [a, b] = h.split('.').map((x) => parseInt(x, 10));
    if (a === 127 || a === 10) return true;
    if (a === 172 && b! >= 16 && b! <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS metadata
    if (a === 0) return true;
    return false;
  }
  // IPv6
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // ULA
  if (h.startsWith('fe80:')) return true; // link-local
  return false;
}

function computeSignature(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Serializa Date como ISO sem `Z` final, igual ao formato do AgentMail
 * ("2026-03-20T21:45:00.635300552").
 */
function isoNoTz(d: Date): string {
  return d.toISOString().replace(/Z$/, '');
}

@Injectable()
export class WebhookDispatcherService {
  private readonly log = new Logger(WebhookDispatcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispara um evento para todos os endpoints inscritos do workspace.
   * Persiste o evento e cada tentativa de entrega; tenta até MAX_ATTEMPTS
   * com backoff exponencial (1s → 32s) por endpoint.
   */
  async dispatch(input: {
    workspaceId: string;
    eventType: WebhookEventType;
    messageId?: string | null;
    /** Mailbox associada ao evento (se aplicável). Usado para filtrar `inboxIds`. */
    mailboxId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const { workspaceId, eventType, messageId, mailboxId, payload } = input;

    const event = await this.prisma.webhookEvent.create({
      data: {
        workspaceId,
        eventType,
        messageId: messageId ?? null,
        payload: payload as never,
      },
    });

    // Procura webhooks no workspace owner OU nos workspaces escopados que
    // referenciam este workspaceId em `workspace_ids`.
    const candidates = await this.prisma.webhook.findMany({
      where: {
        enabled: true,
        OR: [{ events: { isEmpty: true } }, { events: { has: eventType } }],
        AND: [
          {
            OR: [
              { workspaceId },
              { workspaceIds: { has: workspaceId } },
            ],
          },
        ],
      },
    });

    // Aplica filtro de inboxIds se houver.
    const targets = candidates.filter((w) => {
      if (w.inboxIds.length === 0) return true;
      if (!mailboxId) return false;
      return w.inboxIds.includes(mailboxId);
    });

    if (targets.length === 0) return;

    const fullPayload = {
      event_id: event.id,
      event_type: WEBHOOK_EVENT_PUBLIC_NAME[eventType],
      type: 'event' as const,
      ...payload,
    };
    const body = JSON.stringify(fullPayload);

    await Promise.all(
      targets.map((w) => this.deliverWithRetries(w.id, w.url, w.secret, event.id, body)),
    );
  }

  /**
   * Entrega única (sem retry) — usado pelo botão "Test" do painel.
   * Persiste apenas a tentativa #1.
   */
  async deliverSingle(
    webhookId: string,
    url: string,
    secret: string,
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.attemptOnce(webhookId, url, secret, eventId, JSON.stringify(payload), 1);
  }

  /**
   * Entrega com retries — usado pelo callback do Stalwart e por outros
   * disparos não-teste. Fora de `dispatch()` para casos onde já temos um
   * webhook específico (sem fan-out por workspace).
   */
  async deliverToWebhook(
    webhookId: string,
    url: string,
    secret: string,
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.deliverWithRetries(webhookId, url, secret, eventId, JSON.stringify(payload));
  }

  private async deliverWithRetries(
    webhookId: string,
    url: string,
    secret: string,
    eventId: string,
    body: string,
  ): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const ok = await this.attemptOnce(webhookId, url, secret, eventId, body, attempt);
      if (ok) return;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(Math.min(2 ** attempt, 32) * 1000);
      }
    }
  }

  private async attemptOnce(
    webhookId: string,
    url: string,
    secret: string,
    eventId: string,
    body: string,
    attempt: number,
  ): Promise<boolean> {
    const signature = computeSignature(secret, body);
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let status: WebhookAttemptStatus = WebhookAttemptStatus.FAILED;
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      if (!ALLOW_PRIVATE_TARGETS) {
        const parsed = new URL(url);
        if (isPrivateHost(parsed.hostname)) {
          throw new Error(`destino privado bloqueado (SSRF): ${parsed.hostname}`);
        }
      }
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'HubMail-Webhooks/1.0',
          'x-hubmail-event': eventId,
          'x-hubmail-signature': `sha256=${signature}`,
          'x-hubmail-attempt': String(attempt),
        },
        body,
        signal: controller.signal,
      });
      statusCode = res.status;
      try {
        const text = await res.text();
        responseBody = text.slice(0, MAX_RESPONSE_BODY_CHARS);
      } catch {
        responseBody = null;
      }
      if (res.ok) {
        status = WebhookAttemptStatus.SUCCEEDED;
      } else {
        errorMessage = `HTTP ${res.status}`;
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message.slice(0, 1000) : 'unknown error';
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startedAt;

    try {
      await this.prisma.webhookAttempt.create({
        data: {
          webhookId,
          eventId,
          url,
          status,
          statusCode,
          responseBody,
          errorMessage,
          attempt,
          durationMs,
        },
      });
    } catch (e) {
      this.log.error(
        `Falha ao gravar tentativa de webhook ${webhookId}: ${
          e instanceof Error ? e.message : 'unknown'
        }`,
      );
    }

    return status === WebhookAttemptStatus.SUCCEEDED;
  }
}

export const WebhookPayloadHelpers = {
  isoNoTz,
};
