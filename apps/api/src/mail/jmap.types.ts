export interface JmapSession {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  primaryAccounts: Record<string, string>;
  accounts: Record<string, { name?: string; isPersonal?: boolean }>;
}

export interface JmapMailboxSummary {
  id: string;
  name: string;
  role?: string | null;
  parentId?: string | null;
  totalEmails: number;
  unreadEmails: number;
  sortOrder?: number;
}

export interface JmapEmailAddress {
  name?: string | null;
  email: string;
}

export interface JmapEmail {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  subject?: string | null;
  preview?: string | null;
  from?: JmapEmailAddress[] | null;
  to?: JmapEmailAddress[] | null;
  cc?: JmapEmailAddress[] | null;
  bcc?: JmapEmailAddress[] | null;
  replyTo?: JmapEmailAddress[] | null;
  receivedAt: string;
  sentAt?: string | null;
  size?: number;
  hasAttachment?: boolean;
  bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>;
  htmlBody?: Array<{ partId?: string; type?: string; name?: string; size?: number }>;
  textBody?: Array<{ partId?: string; type?: string; name?: string; size?: number }>;
  attachments?: Array<{
    blobId: string;
    name?: string;
    type?: string;
    size?: number;
    disposition?: string;
    cid?: string;
  }>;
  inReplyTo?: string[] | null;
  references?: string[] | null;
}

export interface JmapThread {
  id: string;
  emailIds: string[];
}

export type JmapInvocation = [method: string, args: Record<string, unknown>, callId: string];

export interface JmapResponse {
  methodResponses: JmapInvocation[];
  sessionState?: string;
}
