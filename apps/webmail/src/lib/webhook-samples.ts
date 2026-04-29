/**
 * Exemplos de payload por event_type seguindo o catálogo da AgentMail
 * (https://docs.agentmail.to/api-reference/webhooks/events). Usados pela
 * tela de Testing e pelo Catálogo de Eventos no frontend para mostrar a
 * forma esperada do payload que o webhook receberá.
 */

const ATTACHMENT_SAMPLE = {
  attachment_id: "string",
  content_disposition: "string",
  content_id: "string",
  content_type: "string",
  filename: "string",
  size: 42,
};

const MESSAGE_SAMPLE = {
  attachments: [ATTACHMENT_SAMPLE],
  bcc: ["string"],
  cc: ["string"],
  created_at: "2026-03-20T21:45:00.635654189",
  extracted_html: "string",
  extracted_text: "string",
  from: "string",
  headers: {},
  html: "string",
  in_reply_to: "string",
  inbox_id: "string",
  labels: ["string"],
  message_id: "string",
  preview: "string",
  references: ["string"],
  reply_to: ["string"],
  size: 42,
  subject: "string",
  text: "string",
  thread_id: "string",
  timestamp: "2026-03-20T21:45:00.635661864",
  to: ["string"],
  updated_at: "2026-03-20T21:45:00.635663189",
};

const THREAD_SAMPLE = {
  attachments: [ATTACHMENT_SAMPLE],
  created_at: "2026-03-20T21:45:00.635686385",
  inbox_id: "string",
  labels: ["string"],
  last_message_id: "string",
  message_count: 42,
  preview: "string",
  received_timestamp: "2026-03-20T21:45:00.635688860",
  recipients: ["string"],
  senders: ["string"],
  sent_timestamp: "2026-03-20T21:45:00.635690624",
  size: 42,
  subject: "string",
  thread_id: "string",
  timestamp: "2026-03-20T21:45:00.635691988",
  updated_at: "2026-03-20T21:45:00.635692531",
};

const DOMAIN_SAMPLE = {
  domain_id: "string",
  name: "string",
  status: "VERIFIED",
  created_at: "2026-03-20T21:45:00.635686385",
  updated_at: "2026-03-20T21:45:00.635692531",
};

function envelope(eventType: string, body: Record<string, unknown>) {
  return {
    event_id: "string",
    event_type: eventType,
    type: "event",
    ...body,
  };
}

export const WEBHOOK_SAMPLES: Record<string, Record<string, unknown>> = {
  "domain.verified": envelope("domain.verified", { domain: DOMAIN_SAMPLE }),
  "message.received": envelope("message.received", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
  }),
  "message.received.blocked": envelope("message.received.blocked", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
    reason: "string",
  }),
  "message.received.spam": envelope("message.received.spam", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
  }),
  "message.sent": envelope("message.sent", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
  }),
  "message.delivered": envelope("message.delivered", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
  }),
  "message.bounced": envelope("message.bounced", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
    bounce: {
      recipients: [{ address: "string", status: "string", diagnostic: "string" }],
      timestamp: "2026-03-20T21:45:00.635663189",
    },
  }),
  "message.complained": envelope("message.complained", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
    complaint: {
      feedback_type: "abuse",
      timestamp: "2026-03-20T21:45:00.635663189",
    },
  }),
  "message.rejected": envelope("message.rejected", {
    message: MESSAGE_SAMPLE,
    thread: THREAD_SAMPLE,
    reject: {
      reason: "string",
      timestamp: "2026-03-20T21:45:00.635663189",
    },
  }),
};

export function getWebhookSample(eventType: string): Record<string, unknown> {
  return WEBHOOK_SAMPLES[eventType] ?? envelope(eventType, {});
}
