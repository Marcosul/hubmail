-- CreateEnum: webhook event type
CREATE TYPE "WebhookEventType" AS ENUM (
    'DOMAIN_VERIFIED',
    'MESSAGE_RECEIVED',
    'MESSAGE_RECEIVED_BLOCKED',
    'MESSAGE_RECEIVED_SPAM',
    'MESSAGE_SENT',
    'MESSAGE_DELIVERED',
    'MESSAGE_BOUNCED',
    'MESSAGE_COMPLAINED',
    'MESSAGE_REJECTED'
);

-- CreateEnum: webhook attempt status
CREATE TYPE "WebhookAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable: webhooks
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "description" VARCHAR(500),
    "secret" TEXT NOT NULL,
    "events" "WebhookEventType"[] DEFAULT ARRAY[]::"WebhookEventType"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhooks_workspace_id_enabled_idx" ON "webhooks"("workspace_id", "enabled");

ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: webhook_events
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "event_type" "WebhookEventType" NOT NULL,
    "message_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_events_workspace_id_created_at_idx" ON "webhook_events"("workspace_id", "created_at");
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: webhook_attempts
CREATE TABLE "webhook_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "status" "WebhookAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "status_code" INTEGER,
    "response_body" VARCHAR(2000),
    "error_message" VARCHAR(1000),
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_attempts_webhook_id_created_at_idx" ON "webhook_attempts"("webhook_id", "created_at");
CREATE INDEX "webhook_attempts_event_id_idx" ON "webhook_attempts"("event_id");

ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_webhook_id_fkey"
    FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "webhook_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
