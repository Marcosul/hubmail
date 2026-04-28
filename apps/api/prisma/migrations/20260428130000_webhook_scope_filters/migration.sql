ALTER TABLE "webhooks"
  ADD COLUMN "client_id" TEXT,
  ADD COLUMN "workspace_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "inbox_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
