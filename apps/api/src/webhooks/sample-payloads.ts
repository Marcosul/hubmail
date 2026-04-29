import { WebhookEventType } from '@prisma/client';

/**
 * Gera o payload de exemplo (AgentMail-style) usado pelo botão de teste do
 * dashboard. Estrutura compatível com
 * https://docs.agentmail.to/api-reference/webhooks/events/message-received.
 *
 * Não inclui o envelope `event_id`/`event_type`/`type` — esse é adicionado
 * pelo dispatcher.
 */

function isoDate(d: Date): string {
  return d.toISOString().replace(/Z$/, '');
}

interface BuildOpts {
  messageId: string;
  inboxId?: string | null;
  inboxAddress?: string | null;
  workspaceId: string;
  now: Date;
}

function buildAttachmentSample() {
  return {
    attachment_id: 'att_test',
    content_disposition: 'attachment',
    content_id: 'cid_test',
    content_type: 'application/octet-stream',
    filename: 'sample.txt',
    size: 42,
  };
}

function buildMessageSample(o: BuildOpts) {
  const ts = isoDate(o.now);
  const recipient = o.inboxAddress ?? 'recipient@example.com';
  return {
    attachments: [buildAttachmentSample()],
    bcc: [],
    cc: [],
    created_at: ts,
    extracted_html: '<p>Test</p>',
    extracted_text: 'Test',
    from: 'sender@example.com',
    headers: {},
    html: '<p>Test</p>',
    in_reply_to: null,
    inbox_id: o.inboxId ?? null,
    labels: ['Inbox'],
    message_id: o.messageId,
    preview: 'Test message preview',
    references: [],
    reply_to: [],
    size: 1024,
    subject: 'Test webhook event',
    text: 'Test',
    thread_id: `thread_${o.messageId}`,
    timestamp: ts,
    to: [recipient],
    updated_at: ts,
  };
}

function buildThreadSample(o: BuildOpts) {
  const ts = isoDate(o.now);
  const recipient = o.inboxAddress ?? 'recipient@example.com';
  return {
    attachments: [buildAttachmentSample()],
    created_at: ts,
    inbox_id: o.inboxId ?? null,
    labels: ['Inbox'],
    last_message_id: o.messageId,
    message_count: 1,
    preview: 'Test message preview',
    received_timestamp: ts,
    recipients: [recipient],
    senders: ['sender@example.com'],
    sent_timestamp: ts,
    size: 1024,
    subject: 'Test webhook event',
    thread_id: `thread_${o.messageId}`,
    timestamp: ts,
    updated_at: ts,
  };
}

export function buildTestPayload(
  eventType: WebhookEventType,
  opts: BuildOpts,
): Record<string, unknown> {
  if (eventType === 'DOMAIN_VERIFIED') {
    const ts = isoDate(opts.now);
    return {
      domain: {
        domain_id: 'dom_test',
        name: 'example.com',
        status: 'VERIFIED',
        created_at: ts,
        updated_at: ts,
      },
    };
  }

  const message = buildMessageSample(opts);
  const thread = buildThreadSample(opts);
  const ts = isoDate(opts.now);

  switch (eventType) {
    case 'MESSAGE_BOUNCED':
      return {
        message,
        thread,
        bounce: {
          recipients: [
            { address: opts.inboxAddress ?? 'recipient@example.com', status: '5.0.0', diagnostic: 'mailbox unavailable' },
          ],
          timestamp: ts,
        },
      };
    case 'MESSAGE_COMPLAINED':
      return {
        message,
        thread,
        complaint: { feedback_type: 'abuse', timestamp: ts },
      };
    case 'MESSAGE_REJECTED':
      return {
        message,
        thread,
        reject: { reason: 'rejected by remote server', timestamp: ts },
      };
    case 'MESSAGE_RECEIVED_BLOCKED':
      return { message, thread, reason: 'blocked' };
    default:
      return { message, thread };
  }
}
