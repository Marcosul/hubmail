export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type DomainStatus = 'PENDING' | 'VERIFIED' | 'FAILED';
export type WorkspaceInviteStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
export type InviteScope = 'WORKSPACE' | 'DOMAIN' | 'MAILBOX' | 'MAIL_GROUP' | 'WEBHOOK';
export type ResourceRole = 'ADMIN' | 'USER';

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

export interface InviteResourceRef {
  id: string;
  label: string;
}

export interface WorkspaceInviteSummary {
  id: string;
  email: string;
  role: MembershipRole;
  status: WorkspaceInviteStatus;
  expiresAt: string | Date;
  createdAt: string | Date;
  scope: InviteScope;
  resourceRole: ResourceRole | null;
  resource: InviteResourceRef | null;
  acceptUrl: string;
  token: string;
}

export interface CreateWorkspaceInviteInput {
  email: string;
  scope: InviteScope;
  role?: MembershipRole;            // usado apenas quando scope === 'WORKSPACE'
  resourceRole?: ResourceRole;      // usado quando scope !== 'WORKSPACE'
  domainId?: string;
  mailboxId?: string;
  mailGroupId?: string;
  webhookId?: string;
  message?: string;
}

export interface PendingInviteSummary {
  id: string;
  email: string;
  role: MembershipRole;
  resourceRole: ResourceRole | null;
  status: WorkspaceInviteStatus;
  expiresAt: string | Date;
  createdAt: string | Date;
  scope: InviteScope;
  resource: InviteResourceRef | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PublicInviteSummary {
  email: string;
  scope: InviteScope;
  role: MembershipRole;
  resourceRole: ResourceRole | null;
  resource: InviteResourceRef | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName: string | null;
  message: string | null;
  expiresAt: string | Date;
  status: WorkspaceInviteStatus;
}

export interface ResourceMemberSummary {
  id: string;
  userId: string;
  email: string | null;
  role: ResourceRole;
  createdAt: string | Date;
}

export interface DomainSummary {
  id: string;
  name: string;
  status: DomainStatus;
  dnsCheckedAt?: string | Date | null;
  createdAt: string | Date;
}
