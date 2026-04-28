-- AlterTable: soft delete on workspaces
ALTER TABLE "workspaces" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces"("deleted_at");

-- CreateEnum: workspace invite status
CREATE TYPE "WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateTable: workspace_invites
CREATE TABLE "workspace_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "message" VARCHAR(500),
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");
CREATE INDEX "workspace_invites_workspace_id_status_idx" ON "workspace_invites"("workspace_id", "status");
CREATE INDEX "workspace_invites_email_status_idx" ON "workspace_invites"("email", "status");

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
