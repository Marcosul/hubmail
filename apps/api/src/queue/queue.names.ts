export const QUEUE_NAMES = {
  MAIL_INGEST: 'mail.ingest',
  MAIL_SEND_RETRY: 'mail.send.retry',
  WEBHOOK_DISPATCH: 'webhook.dispatch',
  /** HubMail → Stalwart JMAP Management (x:Domain) — assíncrono para escala */
  STALWART_DOMAIN_PROVISION: 'stalwart.domain.provision',
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

export type StalwartDomainProvisionJob = {
  domainId: string;
  /** Aliases extra no Stalwart (não persistidos no modelo Domain) */
  aliases?: string[];
};
