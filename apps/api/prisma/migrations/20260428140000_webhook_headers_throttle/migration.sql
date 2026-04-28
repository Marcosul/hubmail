ALTER TABLE "webhooks"
  ADD COLUMN "headers" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "throttle_ms" INTEGER;
