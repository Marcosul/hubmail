export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type DomainStatus = 'PENDING' | 'VERIFIED' | 'FAILED';
export type WorkspaceInviteStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
  organization: OrganizationSummary;
  createdAt: string | Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  organizationName?: string;
}

export interface UpdateWorkspaceInput {
  name: string;
}

export interface WorkspaceMemberSummary {
  id: string;
  userId: string;
  email: string | null;
  role: MembershipRole;
  createdAt: string | Date;
}

export interface WorkspaceInviteSummary {
  id: string;
  email: string;
  role: MembershipRole;
  status: WorkspaceInviteStatus;
  expiresAt: string | Date;
  createdAt: string | Date;
}

export interface CreateWorkspaceInviteInput {
  email: string;
  role: MembershipRole;
  message?: string;
}

export interface PendingInviteSummary extends WorkspaceInviteSummary {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface DomainSummary {
  id: string;
  name: string;
  status: DomainStatus;
  dnsCheckedAt?: string | Date | null;
  createdAt: string | Date;
}
