import { WebhookEventType } from '@prisma/client';

/**
 * Mapeamento entre o enum interno (Prisma) e a string pública usada no payload
 * (ex.: "message.received"), seguindo o catálogo do AgentMail.
 */
export const WEBHOOK_EVENT_PUBLIC_NAME: Record<WebhookEventType, string> = {
  DOMAIN_VERIFIED: 'domain.verified',
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_RECEIVED_BLOCKED: 'message.received.blocked',
  MESSAGE_RECEIVED_SPAM: 'message.received.spam',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_BOUNCED: 'message.bounced',
  MESSAGE_COMPLAINED: 'message.complained',
  MESSAGE_REJECTED: 'message.rejected',
};

export const WEBHOOK_EVENT_FROM_PUBLIC: Record<string, WebhookEventType> = Object.fromEntries(
  Object.entries(WEBHOOK_EVENT_PUBLIC_NAME).map(([k, v]) => [v, k as WebhookEventType]),
) as Record<string, WebhookEventType>;

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = Object.keys(
  WEBHOOK_EVENT_PUBLIC_NAME,
) as WebhookEventType[];
