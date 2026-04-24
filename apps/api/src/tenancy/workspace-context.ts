import type { MembershipRole } from '@prisma/client';

export type WorkspaceContext = {
  workspaceId: string;
  organizationId: string;
  membershipId: string;
  role: MembershipRole;
};
