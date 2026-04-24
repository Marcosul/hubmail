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

export interface PatchMessageInput {
  starred?: boolean;
  unread?: boolean;
  moveToMailbox?: string;
  labels?: string[];
  delete?: boolean;
}
