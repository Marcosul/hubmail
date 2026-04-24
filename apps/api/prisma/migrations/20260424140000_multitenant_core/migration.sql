-- Multi-tenant core + mail/outbox/webhook/agents scaffold
-- Extends the initial `profiles` table with the full HubMail platform schema.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
CREATE TYPE "MailCredentialKind" AS ENUM ('APP_PASSWORD', 'OAUTH2');
CREATE TYPE "OutgoingMessageStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "InboxEventType" AS ENUM ('RECEIVED', 'DELIVERED', 'BOUNCED', 'SPAM', 'OTHER');
CREATE TYPE "AutomationTrigger" AS ENUM ('MAIL_RECEIVED', 'MAIL_SENT', 'MAIL_BOUNCED');
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspaces_organization_id_slug_key" ON "workspaces"("organization_id", "slug");
CREATE INDEX "workspaces_created_at_idx" ON "workspaces"("created_at");
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
CREATE TABLE "memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "memberships_user_id_workspace_id_key" ON "memberships"("user_id", "workspace_id");
CREATE INDEX "memberships_workspace_id_idx" ON "memberships"("workspace_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- domains
-- ---------------------------------------------------------------------------
CREATE TABLE "domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "dns_checked_at" TIMESTAMP(3),
    "webhook_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "domains_workspace_id_name_key" ON "domains"("workspace_id", "name");
CREATE INDEX "domains_status_idx" ON "domains"("status");
ALTER TABLE "domains" ADD CONSTRAINT "domains_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- mail_credentials (created before mailboxes so the FK can be declared at once)
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailbox_id" UUID NOT NULL,
    "kind" "MailCredentialKind" NOT NULL DEFAULT 'APP_PASSWORD',
    "secret_ref" TEXT NOT NULL,
    "username" TEXT,
    "rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_credentials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mail_credentials_mailbox_id_idx" ON "mail_credentials"("mailbox_id");

-- ---------------------------------------------------------------------------
-- mailboxes
-- ---------------------------------------------------------------------------
CREATE TABLE "mailboxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "display_name" TEXT,
    "stalwart_account_id" TEXT,
    "credential_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailboxes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mailboxes_workspace_id_address_key" ON "mailboxes"("workspace_id", "address");
CREATE UNIQUE INDEX "mailboxes_credential_id_key" ON "mailboxes"("credential_id");
CREATE INDEX "mailboxes_domain_id_idx" ON "mailboxes"("domain_id");
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_domain_id_fkey"
    FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "mail_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- message_index
-- ---------------------------------------------------------------------------
CREATE TABLE "message_index" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailbox_id" UUID NOT NULL,
    "jmap_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "subject" TEXT,
    "from_addr" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_index_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "message_index_mailbox_id_jmap_id_key" ON "message_index"("mailbox_id", "jmap_id");
CREATE INDEX "message_index_mailbox_id_received_at_idx" ON "message_index"("mailbox_id", "received_at");
ALTER TABLE "message_index" ADD CONSTRAINT "message_index_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- outgoing_messages
-- ---------------------------------------------------------------------------
CREATE TABLE "outgoing_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "mailbox_id" UUID NOT NULL,
    "from_addr" TEXT NOT NULL,
    "to_addrs" TEXT[] NOT NULL,
    "cc_addrs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "bcc_addrs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "body_html" TEXT,
    "body_text" TEXT,
    "in_reply_to" TEXT,
    "references" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "status" "OutgoingMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outgoing_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outgoing_messages_workspace_id_status_idx" ON "outgoing_messages"("workspace_id", "status");
CREATE INDEX "outgoing_messages_mailbox_id_created_at_idx" ON "outgoing_messages"("mailbox_id", "created_at");
ALTER TABLE "outgoing_messages" ADD CONSTRAINT "outgoing_messages_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outgoing_messages" ADD CONSTRAINT "outgoing_messages_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- inbox_events
-- ---------------------------------------------------------------------------
CREATE TABLE "inbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "mailbox_id" UUID,
    "message_id" TEXT NOT NULL,
    "type" "InboxEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "signature" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inbox_events_domain_id_message_id_type_key"
    ON "inbox_events"("domain_id", "message_id", "type");
CREATE INDEX "inbox_events_workspace_id_received_at_idx"
    ON "inbox_events"("workspace_id", "received_at");
CREATE INDEX "inbox_events_processed_at_idx" ON "inbox_events"("processed_at");
ALTER TABLE "inbox_events" ADD CONSTRAINT "inbox_events_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inbox_events" ADD CONSTRAINT "inbox_events_domain_id_fkey"
    FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inbox_events" ADD CONSTRAINT "inbox_events_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- automations
-- ---------------------------------------------------------------------------
CREATE TABLE "automations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automations_workspace_id_trigger_idx" ON "automations"("workspace_id", "trigger");
ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- api_keys
-- ---------------------------------------------------------------------------
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_keys_hash_key" ON "api_keys"("hash");
CREATE INDEX "api_keys_workspace_id_revoked_at_idx" ON "api_keys"("workspace_id", "revoked_at");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- agents / agent_runs / agent_actions / budgets (Fase 3 scaffold)
-- ---------------------------------------------------------------------------
CREATE TABLE "agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "policy" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agents_workspace_id_enabled_idx" ON "agents"("workspace_id", "enabled");
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "trigger_event_id" UUID,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_runs_agent_id_status_idx" ON "agent_runs"("agent_id", "status");
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_actions_run_id_idx" ON "agent_actions"("run_id");
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "budgets" (
    "workspace_id" UUID NOT NULL,
    "monthly_cents" INTEGER NOT NULL DEFAULT 0,
    "used_cents" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("workspace_id")
);
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The Nest API talks to Postgres with the service role (bypasses RLS), so
-- these policies are defensive against accidental anon access. Mutations are
-- always authorized through the API's workspace guard.
-- ---------------------------------------------------------------------------
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_self_read" ON "profiles";
CREATE POLICY "profiles_self_read" ON "profiles"
    FOR SELECT TO authenticated
    USING (id = auth.uid());

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mailboxes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_index" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outgoing_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users on memberships (so they can
-- discover the workspaces they belong to directly via Supabase if desired).
DROP POLICY IF EXISTS "memberships_self_read" ON "memberships";
CREATE POLICY "memberships_self_read" ON "memberships"
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
