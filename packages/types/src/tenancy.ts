export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type DomainStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

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

export interface DomainSummary {
  id: string;
  name: string;
  status: DomainStatus;
  dnsCheckedAt?: string | Date | null;
  createdAt: string | Date;
}
