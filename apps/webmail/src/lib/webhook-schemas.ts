/**
 * Definição estruturada do schema de cada event_type — usada pela árvore
 * do schema na tela de Testing e no Catálogo de Eventos. Espelha o
 * formato da AgentMail (https://docs.agentmail.to/api-reference/webhooks/events).
 */

export type FieldKind =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "object"
  | "array[]";

export interface SchemaField {
  name: string;
  kind: FieldKind;
  /** Subtipo do array (`string`, `object`, ...). */
  itemKind?: FieldKind;
  /** Modificadores adicionais ao lado do tipo, ex.: `date-time`. */
  format?: string;
  optional?: boolean;
  description?: string;
  title?: string;
  const?: string;
  enum?: string[];
  /** Para `object` ou `array[]` cujo item é objeto. */
  children?: SchemaField[];
}

const ATTACHMENT_FIELDS: SchemaField[] = [
  {
    name: "attachment_id",
    kind: "string",
    title: "AttachmentId",
    description: "ID of attachment.",
  },
  {
    name: "content_disposition",
    kind: "string",
    optional: true,
    title: "AttachmentContentDisposition",
    enum: ["inline", "attachment"],
    description: "Content disposition of attachment.",
  },
  {
    name: "content_id",
    kind: "string",
    optional: true,
    description: "Content ID of attachment.",
  },
  {
    name: "content_type",
    kind: "string",
    optional: true,
    description: "Content type of attachment.",
  },
  {
    name: "filename",
    kind: "string",
    optional: true,
    description: "Filename of attachment.",
  },
  {
    name: "size",
    kind: "integer",
    optional: true,
    description: "Size of attachment in bytes.",
  },
];

const MESSAGE_FIELDS: SchemaField[] = [
  {
    name: "attachments",
    kind: "array[]",
    itemKind: "object",
    optional: true,
    description: "Attachments in message.",
    children: ATTACHMENT_FIELDS,
  },
  {
    name: "bcc",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description:
      "Addresses of BCC recipients. In format username@domain.com or Display Name <username@domain.com>.",
  },
  {
    name: "cc",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description:
      "Addresses of CC recipients. In format username@domain.com or Display Name <username@domain.com>.",
  },
  {
    name: "created_at",
    kind: "string",
    format: "date-time",
    description: "Time at which message was created.",
  },
  {
    name: "extracted_html",
    kind: "string",
    optional: true,
    description: "Extracted HTML body of message.",
  },
  {
    name: "extracted_text",
    kind: "string",
    optional: true,
    description: "Extracted text body of message.",
  },
  {
    name: "from",
    kind: "string",
    description:
      "Address of sender. In format username@domain.com or Display Name <username@domain.com>.",
  },
  {
    name: "headers",
    kind: "object",
    description: "Raw headers of message.",
  },
  {
    name: "html",
    kind: "string",
    optional: true,
    description: "HTML body of message.",
  },
  {
    name: "in_reply_to",
    kind: "string",
    optional: true,
    description: "ID of message this message is replying to.",
  },
  { name: "inbox_id", kind: "string", description: "ID of inbox." },
  {
    name: "labels",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description: "Labels of message.",
  },
  { name: "message_id", kind: "string", description: "ID of message." },
  { name: "preview", kind: "string", description: "Preview of message." },
  {
    name: "references",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description: "References of message.",
  },
  {
    name: "reply_to",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description: "Reply-To addresses of message.",
  },
  { name: "size", kind: "integer", description: "Size of message in bytes." },
  { name: "subject", kind: "string", description: "Subject of message." },
  {
    name: "text",
    kind: "string",
    optional: true,
    description: "Text body of message.",
  },
  { name: "thread_id", kind: "string", description: "ID of thread." },
  {
    name: "timestamp",
    kind: "string",
    format: "date-time",
    description: "Timestamp of message.",
  },
  {
    name: "to",
    kind: "array[]",
    itemKind: "string",
    description:
      "Addresses of recipients. In format username@domain.com or Display Name <username@domain.com>.",
  },
  {
    name: "updated_at",
    kind: "string",
    format: "date-time",
    description: "Time at which message was last updated.",
  },
];

const THREAD_FIELDS: SchemaField[] = [
  {
    name: "attachments",
    kind: "array[]",
    itemKind: "object",
    optional: true,
    description: "Attachments in thread.",
    children: ATTACHMENT_FIELDS,
  },
  {
    name: "created_at",
    kind: "string",
    format: "date-time",
    description: "Time at which thread was created.",
  },
  { name: "inbox_id", kind: "string", description: "ID of inbox." },
  {
    name: "labels",
    kind: "array[]",
    itemKind: "string",
    optional: true,
    description: "Labels of thread.",
  },
  {
    name: "last_message_id",
    kind: "string",
    description: "ID of last message in thread.",
  },
  {
    name: "message_count",
    kind: "integer",
    description: "Number of messages in thread.",
  },
  { name: "preview", kind: "string", description: "Preview of thread." },
  {
    name: "received_timestamp",
    kind: "string",
    format: "date-time",
    description: "Time at which the last message was received.",
  },
  {
    name: "recipients",
    kind: "array[]",
    itemKind: "string",
    description: "Recipients of thread.",
  },
  {
    name: "senders",
    kind: "array[]",
    itemKind: "string",
    description: "Senders of thread.",
  },
  {
    name: "sent_timestamp",
    kind: "string",
    format: "date-time",
    description: "Time at which the last message was sent.",
  },
  { name: "size", kind: "integer", description: "Size of thread in bytes." },
  { name: "subject", kind: "string", description: "Subject of thread." },
  { name: "thread_id", kind: "string", description: "ID of thread." },
  {
    name: "timestamp",
    kind: "string",
    format: "date-time",
    description: "Timestamp of thread.",
  },
  {
    name: "updated_at",
    kind: "string",
    format: "date-time",
    description: "Time at which thread was last updated.",
  },
];

const DOMAIN_FIELDS: SchemaField[] = [
  { name: "domain_id", kind: "string", description: "ID of domain." },
  { name: "name", kind: "string", description: "Name of domain." },
  {
    name: "status",
    kind: "string",
    enum: ["PENDING", "VERIFIED", "FAILED"],
    description: "Verification status.",
  },
  { name: "created_at", kind: "string", format: "date-time" },
  { name: "updated_at", kind: "string", format: "date-time" },
];

function envelope(eventName: string, body: SchemaField[]): SchemaField[] {
  return [
    { name: "event_id", kind: "string", description: "ID of event." },
    { name: "event_type", kind: "string", const: eventName },
    ...body,
    { name: "type", kind: "string", const: "event" },
  ];
}

function messageEvent(
  eventName: string,
  extra: SchemaField[] = [],
): SchemaField[] {
  return envelope(eventName, [
    {
      name: "message",
      kind: "object",
      description: "The message.",
      children: MESSAGE_FIELDS,
    },
    {
      name: "thread",
      kind: "object",
      description: "The thread the message belongs to.",
      children: THREAD_FIELDS,
    },
    ...extra,
  ]);
}

export const WEBHOOK_SCHEMAS: Record<string, SchemaField[]> = {
  "domain.verified": envelope("domain.verified", [
    {
      name: "domain",
      kind: "object",
      description: "The verified domain.",
      children: DOMAIN_FIELDS,
    },
  ]),
  "message.received": messageEvent("message.received"),
  "message.received.blocked": messageEvent("message.received.blocked", [
    {
      name: "reason",
      kind: "string",
      optional: true,
      description: "Reason the message was blocked.",
    },
  ]),
  "message.received.spam": messageEvent("message.received.spam"),
  "message.sent": messageEvent("message.sent"),
  "message.delivered": messageEvent("message.delivered"),
  "message.bounced": messageEvent("message.bounced", [
    {
      name: "bounce",
      kind: "object",
      description: "Bounce details.",
      children: [
        {
          name: "recipients",
          kind: "array[]",
          itemKind: "object",
          children: [
            { name: "address", kind: "string" },
            { name: "status", kind: "string" },
            { name: "diagnostic", kind: "string", optional: true },
          ],
        },
        { name: "timestamp", kind: "string", format: "date-time" },
      ],
    },
  ]),
  "message.complained": messageEvent("message.complained", [
    {
      name: "complaint",
      kind: "object",
      description: "Complaint details.",
      children: [
        { name: "feedback_type", kind: "string" },
        { name: "timestamp", kind: "string", format: "date-time" },
      ],
    },
  ]),
  "message.rejected": messageEvent("message.rejected", [
    {
      name: "reject",
      kind: "object",
      description: "Reject details.",
      children: [
        { name: "reason", kind: "string" },
        { name: "timestamp", kind: "string", format: "date-time" },
      ],
    },
  ]),
};

export function getWebhookSchema(eventName: string): SchemaField[] {
  return WEBHOOK_SCHEMAS[eventName] ?? envelope(eventName, []);
}
