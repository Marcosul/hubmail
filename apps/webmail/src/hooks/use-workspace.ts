"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  apiRequest,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@/api/rest/generic";
import type {
  CreateWorkspaceInput,
  CreateWorkspaceInviteInput,
  PublicInviteSummary,
  UpdateWorkspaceInput,
  WorkspaceMemberSummary,
  WorkspaceInviteSummary,
  WorkspaceSummary,
  PendingInviteSummary,
} from "@hubmail/types";

const WORKSPACES_KEY = ["workspaces"] as const;
const membersKey = (id: string) => ["workspace-members", id] as const;
const invitesKey = (id: string) => ["workspace-invites", id] as const;
const PENDING_INVITES_KEY = ["pending-invites"] as const;

// ---------------------------------------------------------------------------
// Workspace CRUD
// ---------------------------------------------------------------------------

export function useWorkspaces() {
  return useQuery<WorkspaceSummary[]>({
    queryKey: WORKSPACES_KEY,
    queryFn: () => apiRequest<WorkspaceSummary[]>("/api/workspaces"),
  });
}

export function useBootstrapWorkspace() {
  const qc = useQueryClient();
  return useMutation<WorkspaceSummary>({
    mutationFn: () =>
      apiRequest<WorkspaceSummary>("/api/workspaces/bootstrap", { method: "POST" }),
    onSuccess: (workspace) => {
      setActiveWorkspaceId(workspace.id);
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation<WorkspaceSummary, Error, CreateWorkspaceInput>({
    mutationFn: (input) =>
      apiRequest<WorkspaceSummary>("/api/workspaces", {
        method: "POST",
        body: input,
      }),
    onSuccess: (workspace) => {
      setActiveWorkspaceId(workspace.id);
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<WorkspaceSummary, Error, UpdateWorkspaceInput>({
    mutationFn: (input) =>
      apiRequest<WorkspaceSummary>(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (workspaceId) =>
      apiRequest<void>(`/api/workspaces/${workspaceId}`, { method: "DELETE" }),
    onSuccess: (_data, workspaceId) => {
      const current = getActiveWorkspaceId();
      if (current === workspaceId) setActiveWorkspaceId(null);
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<WorkspaceMemberSummary[]>({
    queryKey: membersKey(workspaceId ?? ""),
    queryFn: () =>
      apiRequest<WorkspaceMemberSummary[]>(`/api/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<
    { id: string; role: string },
    Error,
    { membershipId: string; role: string }
  >({
    mutationFn: ({ membershipId, role }) =>
      apiRequest(`/api/workspaces/${workspaceId}/members/${membershipId}`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (membershipId) =>
      apiRequest<void>(`/api/workspaces/${workspaceId}/members/${membershipId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export function useWorkspaceInvites(workspaceId: string | undefined) {
  return useQuery<WorkspaceInviteSummary[]>({
    queryKey: invitesKey(workspaceId ?? ""),
    queryFn: () =>
      apiRequest<WorkspaceInviteSummary[]>(`/api/workspaces/${workspaceId}/invites`),
    enabled: !!workspaceId,
  });
}

export function useCreateInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<WorkspaceInviteSummary, Error, CreateWorkspaceInviteInput>({
    mutationFn: (input) =>
      apiRequest<WorkspaceInviteSummary>(`/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(workspaceId) }),
  });
}

export function useCancelInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (inviteId) =>
      apiRequest<void>(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(workspaceId) }),
  });
}

export function useResendInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; expiresAt: string }, Error, string>({
    mutationFn: (inviteId) =>
      apiRequest(`/api/workspaces/${workspaceId}/invites/${inviteId}/resend`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(workspaceId) }),
  });
}

export function usePendingInvites() {
  return useQuery<PendingInviteSummary[]>({
    queryKey: PENDING_INVITES_KEY,
    queryFn: () => apiRequest<PendingInviteSummary[]>("/api/invites/pending"),
  });
}

export function usePublicInvite(token: string | undefined) {
  return useQuery<PublicInviteSummary>({
    queryKey: ["public-invite", token ?? ""],
    queryFn: () =>
      apiRequest<PublicInviteSummary>(`/api/public/invites/${token}`, { skipAuth: true }),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation<{ workspace: { id: string; name: string; slug: string } }, Error, string>({
    mutationFn: (token) =>
      apiRequest(`/api/invites/${token}/accept`, { method: "POST" }),
    onSuccess: (data) => {
      setActiveWorkspaceId(data.workspace.id);
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY });
      qc.invalidateQueries({ queryKey: PENDING_INVITES_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function useEnsureActiveWorkspace(workspaces?: WorkspaceSummary[]) {
  useEffect(() => {
    if (!workspaces?.length) return;
    const current = getActiveWorkspaceId();
    const stillExists = current && workspaces.some((w) => w.id === current);
    if (!stillExists) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces]);
}

export { getActiveWorkspaceId, setActiveWorkspaceId };
