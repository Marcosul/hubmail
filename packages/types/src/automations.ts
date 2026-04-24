export type AutomationTrigger =
  | 'MAIL_RECEIVED'
  | 'MAIL_SENT'
  | 'MAIL_BOUNCED';

export type InboxEventType =
  | 'RECEIVED'
  | 'DELIVERED'
  | 'BOUNCED'
  | 'SPAM'
  | 'OTHER';

export interface AutomationCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'domain' | 'label';
  operator: 'contains' | 'equals' | 'regex' | 'startsWith' | 'endsWith';
  value: string;
}

export interface AutomationAction {
  type: 'forward-webhook' | 'add-label' | 'move-to' | 'reply' | 'call-agent';
  config: Record<string, unknown>;
}

export interface AutomationSummary {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InboxEventSummary {
  id: string;
  type: InboxEventType;
  messageId: string;
  domainId: string;
  receivedAt: string | Date;
  processedAt?: string | Date | null;
}

export interface MetricsSnapshot {
  windowHours: number;
  sent: number;
  delivered: number;
  deliveryPct: number;
  received: number;
  bounced: number;
  complained: number;
  rejected: number;
  score: number;
  generatedAt: string;
}
