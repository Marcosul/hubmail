"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import type {
  AgentRunSummary,
  AgentSummary,
  BudgetSummary,
} from "@hubmail/types";

type CreateAgentInput = {
  name: string;
  model: string;
  systemPrompt: string;
  tools?: string[];
  policy?: Record<string, unknown>;
  enabled?: boolean;
};

export function useAgents() {
  return useQuery<AgentSummary[]>({
    queryKey: ["agents"],
    queryFn: () => apiRequest<AgentSummary[]>("/api/agents"),
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation<AgentSummary, Error, CreateAgentInput>({
    mutationFn: (body) =>
      apiRequest<AgentSummary>("/api/agents", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation<AgentSummary, Error, { id: string; patch: Partial<CreateAgentInput> }>({
    mutationFn: ({ id, patch }) =>
      apiRequest<AgentSummary>(`/api/agents/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiRequest<void>(`/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useAgentBudget() {
  return useQuery<BudgetSummary | null>({
    queryKey: ["agent-budget"],
    queryFn: () => apiRequest<BudgetSummary | null>("/api/agents/budget/current"),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation<BudgetSummary, Error, { monthlyCents: number }>({
    mutationFn: (body) =>
      apiRequest<BudgetSummary>("/api/agents/budget", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-budget"] }),
  });
}

export function useAgentRuns(agentId: string | undefined) {
  return useQuery<AgentRunSummary[]>({
    queryKey: ["agent-runs", agentId],
    queryFn: () =>
      apiRequest<AgentRunSummary[]>(
        `/api/agents/${encodeURIComponent(agentId!)}/runs`,
      ),
    enabled: Boolean(agentId),
  });
}

export function useRunAgent() {
  const qc = useQueryClient();
  return useMutation<AgentRunSummary, Error, { id: string; dryRun?: boolean; input?: Record<string, unknown> }>({
    mutationFn: ({ id, dryRun = true, input }) =>
      apiRequest<AgentRunSummary>(`/api/agents/${encodeURIComponent(id)}/runs`, {
        method: "POST",
        body: { dryRun, input },
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-runs", vars.id] });
    },
  });
}
