-- Mailbox: campos completos do Stalwart Account
ALTER TABLE "mailboxes"
  ADD COLUMN "full_name"           TEXT,
  ADD COLUMN "aliases"             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "locale"              TEXT,
  ADD COLUMN "time_zone"           TEXT,
  ADD COLUMN "quota_bytes"         BIGINT,
  ADD COLUMN "encryption_at_rest"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "roles"               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "permissions"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "active"              BOOLEAN NOT NULL DEFAULT TRUE;

-- MailGroup
CREATE TABLE "mail_groups" (
  "id"                  UUID PRIMARY KEY,
  "workspace_id"        UUID NOT NULL,
  "domain_id"           UUID NOT NULL,
  "address"             TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "stalwart_account_id" TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mail_groups_workspace_id_fkey" FOREIGN KEY ("workspace_id")
    REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mail_groups_domain_id_fkey" FOREIGN KEY ("domain_id")
    REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mail_groups_workspace_id_address_key" ON "mail_groups"("workspace_id", "address");
CREATE INDEX "mail_groups_domain_id_idx" ON "mail_groups"("domain_id");

-- MailGroupMember
CREATE TABLE "mail_group_members" (
  "id"         UUID PRIMARY KEY,
  "group_id"   UUID NOT NULL,
  "mailbox_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mail_group_members_group_id_fkey" FOREIGN KEY ("group_id")
    REFERENCES "mail_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mail_group_members_mailbox_id_fkey" FOREIGN KEY ("mailbox_id")
    REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mail_group_members_group_id_mailbox_id_key" ON "mail_group_members"("group_id", "mailbox_id");
CREATE INDEX "mail_group_members_mailbox_id_idx" ON "mail_group_members"("mailbox_id");
