export const QUEUE_NAMES = {
  MAIL_INGEST: 'mail.ingest',
  MAIL_SEND_RETRY: 'mail.send.retry',
  WEBHOOK_DISPATCH: 'webhook.dispatch',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type MailIngestJob = {
  eventId: string;
  workspaceId: string;
};

export type MailSendRetryJob = {
  outgoingMessageId: string;
};

export type WebhookDispatchJob = {
  url: string;
  secret?: string;
  payload: unknown;
  attempt?: number;
};
