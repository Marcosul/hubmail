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
  WorkspaceSummary,
} from "@hubmail/types";

const WORKSPACES_KEY = ["workspaces"] as const;

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

/**
 * Hydrates the active workspace cookie with the first workspace returned
 * by the API, if none was set yet.
 */
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
