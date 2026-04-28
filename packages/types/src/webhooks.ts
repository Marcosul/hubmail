export type WebhookEventType =
  | 'DOMAIN_VERIFIED'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_RECEIVED_BLOCKED'
  | 'MESSAGE_RECEIVED_SPAM'
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_BOUNCED'
  | 'MESSAGE_COMPLAINED'
  | 'MESSAGE_REJECTED';

export type WebhookAttemptStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface Webhook {
  id: string;
  url: string;
  description: string | null;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookWithSecret extends Webhook {
  secret: string;
}

export interface WebhookEventSummary {
  id: string;
  eventType: WebhookEventType;
  messageId: string | null;
  createdAt: string;
}

export interface WebhookAttempt {
  id: string;
  webhookId: string;
  url: string;
  status: WebhookAttemptStatus;
  statusCode: number | null;
  attempt: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface WebhookEventDetail extends WebhookEventSummary {
  payload: Record<string, unknown>;
  attempts: WebhookAttempt[];
}

export interface WebhookActivity {
  windowHours: number;
  since: string;
  succeeded: number;
  failed: number;
  total: number;
  attempts: { status: WebhookAttemptStatus; createdAt: string }[];
}

export interface WebhookCatalogItem {
  type: WebhookEventType;
  name: string;
}

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
