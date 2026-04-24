"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import type {
  AutomationSummary,
  AutomationTrigger,
} from "@hubmail/types";

type CreateAutomationInput = {
  name: string;
  trigger: AutomationTrigger;
  conditions?: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  enabled?: boolean;
};

type UpdateAutomationInput = Partial<CreateAutomationInput>;

export function useAutomations() {
  return useQuery<AutomationSummary[]>({
    queryKey: ["automations"],
    queryFn: () => apiRequest<AutomationSummary[]>("/api/automations"),
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation<AutomationSummary, Error, CreateAutomationInput>({
    mutationFn: (body) =>
      apiRequest<AutomationSummary>("/api/automations", {
        method: "POST",
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation<AutomationSummary, Error, { id: string; patch: UpdateAutomationInput }>({
    mutationFn: ({ id, patch }) =>
      apiRequest<AutomationSummary>(`/api/automations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiRequest<void>(`/api/automations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}
