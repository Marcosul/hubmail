-- Saved filter labels per mailbox (webmail UI; threads match via JMAP label names on messages).

CREATE TABLE "mailbox_saved_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailbox_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailbox_saved_labels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mailbox_saved_labels_mailbox_id_name_key" ON "mailbox_saved_labels"("mailbox_id", "name");
CREATE INDEX "mailbox_saved_labels_mailbox_id_idx" ON "mailbox_saved_labels"("mailbox_id");

ALTER TABLE "mailbox_saved_labels" ADD CONSTRAINT "mailbox_saved_labels_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
