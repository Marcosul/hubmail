export type MailCredentialKind = 'APP_PASSWORD' | 'OAUTH2';
export type OutgoingMessageStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface MailAddress {
  name?: string;
  email: string;
}

export interface MailboxSummary {
  id: string;
  address: string;
  displayName?: string | null;
  domain: string;
  createdAt: string | Date;
  hasCredential: boolean;
}

/** Detalhes completos de uma mailbox (Stalwart Account). */
export interface MailboxDetails extends MailboxSummary {
  fullName?: string | null;
  aliases: string[];
  locale?: string | null;
  timeZone?: string | null;
  quotaBytes?: number | null;
  encryptionAtRest: boolean;
  roles: string[];
  permissions: string[];
  active: boolean;
  stalwartAccountId?: string | null;
  updatedAt: string | Date;
}

export interface UpdateMailboxInput {
  displayName?: string;
  fullName?: string;
  aliases?: string[];
  locale?: string;
  timeZone?: string;
  quotaBytes?: number;
  encryptionAtRest?: boolean;
  roles?: string[];
  permissions?: string[];
  active?: boolean;
}

export interface MailGroupMember {
  id: string;
  address: string;
}

export interface MailGroupSummary {
  id: string;
  address: string;
  name: string;
  description?: string | null;
  domain: string;
  members: MailGroupMember[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MailGroupDetails extends MailGroupSummary {
  stalwartAccountId?: string | null;
}

export interface CreateMailGroupInput {
  address: string;
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateMailGroupInput {
  name?: string;
  description?: string;
  memberIds?: string[];
}

/** User-saved label names for inbox filtering (HubMail DB, not JMAP). */
export interface MailboxSavedLabel {
  id: string;
  name: string;
  createdAt: string | Date;
}

export interface MailFolderSummary {
  id: string;
  name: string;
  role?: string;
  totalEmails: number;
  unreadEmails: number;
  sortOrder?: number;
  parentId?: string | null;
}

export interface ThreadSummary {
  id: string;
  /** Email JMAP usado para PATCH (ex.: marcar lido ao abrir a linha da thread colapsada). */
  anchorEmailId?: string;
  subject: string;
  from: MailAddress;
  preview: string;
  receivedAt: string | Date;
  unread: boolean;
  starred?: boolean;
  flags: string[];
  labels: string[];
  messagesCount: number;
}

export interface ThreadPage {
  threads: ThreadSummary[];
  nextCursor?: string | null;
  total?: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  replyTo?: MailAddress[];
  receivedAt: string | Date;
  sentAt?: string | Date;
  bodyHtml?: string;
  bodyText?: string;
  inReplyTo?: string;
  references?: string[];
  flags: string[];
  labels: string[];
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  id?: string;
  name: string;
  contentType: string;
  size: number;
  inline?: boolean;
  url?: string;
}

export interface SendMailInput {
  mailboxId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  /** Id JMAP do rascunho a remover no servidor após envio. */
  draftEmailId?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    base64: string;
  }>;
  scheduledAt?: string;
}

export interface SendMailResult {
  id: string;
  status: OutgoingMessageStatus;
  createdAt: string | Date;
}

export interface SaveComposeDraftInput {
  mailboxId: string;
  /** Id JMAP do último rascunho guardado nesta sessão (rotação create+destroy). */
  replaceEmailId?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
}

export interface SaveComposeDraftResult {
  emailId: string;
  threadId: string;
}

export interface PatchMessageInput {
  starred?: boolean;
  unread?: boolean;
  moveToMailbox?: string;
  labels?: string[];
  delete?: boolean;
}
