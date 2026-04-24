"use client";

import { useEffect } from "react";
import {
  useBootstrapWorkspace,
  useEnsureActiveWorkspace,
  useWorkspaces,
} from "@/hooks/use-workspace";

/**
 * Ensures the authenticated user has at least one workspace and that the
 * active workspace cookie is populated before the dashboard renders.
 */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useWorkspaces();
  const bootstrap = useBootstrapWorkspace();

  useEnsureActiveWorkspace(data);

  useEffect(() => {
    if (isLoading || isError) return;
    if (!data || data.length === 0) {
      if (!bootstrap.isPending && !bootstrap.isSuccess) {
        bootstrap.mutate();
      }
    }
  }, [isLoading, isError, data, bootstrap]);

  return <>{children}</>;
}
