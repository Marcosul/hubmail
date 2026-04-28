-- Resource-scoped invites & per-resource access grants

-- 1. Enums
CREATE TYPE "InviteScope" AS ENUM ('WORKSPACE', 'DOMAIN', 'MAILBOX', 'MAIL_GROUP', 'WEBHOOK');
CREATE TYPE "ResourceRole" AS ENUM ('ADMIN', 'USER');

-- 2. Estender workspace_invites com scope + FKs opcionais + resource_role
ALTER TABLE "workspace_invites"
  ADD COLUMN "scope"          "InviteScope"   NOT NULL DEFAULT 'WORKSPACE',
  ADD COLUMN "domain_id"      UUID,
  ADD COLUMN "mailbox_id"     UUID,
  ADD COLUMN "mail_group_id"  UUID,
  ADD COLUMN "webhook_id"     UUID,
  ADD COLUMN "resource_role"  "ResourceRole";

CREATE INDEX "workspace_invites_scope_status_idx" ON "workspace_invites" ("scope", "status");

ALTER TABLE "workspace_invites"
  ADD CONSTRAINT "workspace_invites_domain_id_fkey"
    FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "workspace_invites_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "workspace_invites_mail_group_id_fkey"
    FOREIGN KEY ("mail_group_id") REFERENCES "mail_groups"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "workspace_invites_webhook_id_fkey"
    FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE;

-- 3. domain_access
CREATE TABLE "domain_access" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID            NOT NULL,
  "domain_id"    UUID            NOT NULL,
  "user_id"      UUID            NOT NULL,
  "role"         "ResourceRole"  NOT NULL DEFAULT 'USER',
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "domain_access_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "domain_access_domain_id_fkey"
    FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE,
  CONSTRAINT "domain_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "domain_access_user_id_domain_id_key" ON "domain_access" ("user_id", "domain_id");
CREATE INDEX "domain_access_domain_id_idx" ON "domain_access" ("domain_id");
CREATE INDEX "domain_access_workspace_id_idx" ON "domain_access" ("workspace_id");

-- 4. mailbox_access
CREATE TABLE "mailbox_access" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID            NOT NULL,
  "mailbox_id"   UUID            NOT NULL,
  "user_id"      UUID            NOT NULL,
  "role"         "ResourceRole"  NOT NULL DEFAULT 'USER',
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "mailbox_access_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "mailbox_access_mailbox_id_fkey"
    FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE,
  CONSTRAINT "mailbox_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "mailbox_access_user_id_mailbox_id_key" ON "mailbox_access" ("user_id", "mailbox_id");
CREATE INDEX "mailbox_access_mailbox_id_idx" ON "mailbox_access" ("mailbox_id");
CREATE INDEX "mailbox_access_workspace_id_idx" ON "mailbox_access" ("workspace_id");

-- 5. mail_group_access
CREATE TABLE "mail_group_access" (
  "id"            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id"  UUID            NOT NULL,
  "mail_group_id" UUID            NOT NULL,
  "user_id"       UUID            NOT NULL,
  "role"          "ResourceRole"  NOT NULL DEFAULT 'USER',
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "mail_group_access_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "mail_group_access_mail_group_id_fkey"
    FOREIGN KEY ("mail_group_id") REFERENCES "mail_groups"("id") ON DELETE CASCADE,
  CONSTRAINT "mail_group_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "mail_group_access_user_id_mail_group_id_key" ON "mail_group_access" ("user_id", "mail_group_id");
CREATE INDEX "mail_group_access_mail_group_id_idx" ON "mail_group_access" ("mail_group_id");
CREATE INDEX "mail_group_access_workspace_id_idx" ON "mail_group_access" ("workspace_id");

-- 6. webhook_access
CREATE TABLE "webhook_access" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID            NOT NULL,
  "webhook_id"   UUID            NOT NULL,
  "user_id"      UUID            NOT NULL,
  "role"         "ResourceRole"  NOT NULL DEFAULT 'USER',
  "created_at"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "webhook_access_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "webhook_access_webhook_id_fkey"
    FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE,
  CONSTRAINT "webhook_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "webhook_access_user_id_webhook_id_key" ON "webhook_access" ("user_id", "webhook_id");
CREATE INDEX "webhook_access_webhook_id_idx" ON "webhook_access" ("webhook_id");
CREATE INDEX "webhook_access_workspace_id_idx" ON "webhook_access" ("workspace_id");
