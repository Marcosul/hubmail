"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import type {
  Webhook,
  WebhookActivity,
  WebhookCatalogItem,
  WebhookEndpointAttempt,
  WebhookEventDetail,
  WebhookEventSummary,
  WebhookEventType,
  WebhookScopeWorkspace,
  WebhookWithSecret,
} from "@hubmail/types";

const ENDPOINTS_KEY = ["webhook-endpoints"] as const;
const EVENTS_KEY = ["webhook-events"] as const;
const CATALOG_KEY = ["webhook-catalog"] as const;
const ACTIVITY_KEY = ["webhook-activity"] as const;
const SCOPE_KEY = ["webhook-scope-options"] as const;

export function useWebhookScopeOptions() {
  return useQuery<WebhookScopeWorkspace[]>({
    queryKey: SCOPE_KEY,
    queryFn: () => apiRequest<WebhookScopeWorkspace[]>("/api/webhooks/scope-options"),
    staleTime: 60_000,
  });
}

export function useWebhookEndpoints() {
  return useQuery<Webhook[]>({
    queryKey: ENDPOINTS_KEY,
    queryFn: () => apiRequest<Webhook[]>("/api/webhooks/endpoints"),
  });
}

export function useWebhookCatalog() {
  return useQuery<WebhookCatalogItem[]>({
    queryKey: CATALOG_KEY,
    queryFn: () => apiRequest<WebhookCatalogItem[]>("/api/webhooks/event-catalog"),
    staleTime: 60 * 60 * 1000,
  });
}

export interface CreateWebhookInput {
  url: string;
  description?: string;
  events?: WebhookEventType[];
  workspaceIds?: string[];
  inboxIds?: string[];
  clientId?: string;
  headers?: Record<string, string>;
  throttleMs?: number | null;
  enabled?: boolean;
}

export function useWebhookEndpoint(id: string | undefined) {
  return useQuery<Webhook>({
    queryKey: [...ENDPOINTS_KEY, id],
    queryFn: () => apiRequest<Webhook>(`/api/webhooks/endpoints/${id}`),
    enabled: Boolean(id),
  });
}

export function useWebhookAttempts(
  id: string | undefined,
  filter?: { status?: "SUCCEEDED" | "FAILED"; limit?: number },
) {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return useQuery<WebhookEndpointAttempt[]>({
    queryKey: [...ENDPOINTS_KEY, id, "attempts", qs],
    queryFn: () =>
      apiRequest<WebhookEndpointAttempt[]>(
        `/api/webhooks/endpoints/${id}/attempts${qs ? `?${qs}` : ""}`,
      ),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
}

export function useTestWebhook() {
  return useMutation<{ eventId: string }, Error, { id: string; eventType: WebhookEventType }>({
    mutationFn: ({ id, eventType }) =>
      apiRequest(`/api/webhooks/endpoints/${id}/test`, {
        method: "POST",
        body: { eventType },
      }),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation<WebhookWithSecret, Error, CreateWebhookInput>({
    mutationFn: (input) =>
      apiRequest<WebhookWithSecret>("/api/webhooks/endpoints", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
}

export interface UpdateWebhookInput {
  id: string;
  patch: Partial<CreateWebhookInput>;
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation<Webhook, Error, UpdateWebhookInput>({
    mutationFn: ({ id, patch }) =>
      apiRequest<Webhook>(`/api/webhooks/endpoints/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) => apiRequest(`/api/webhooks/endpoints/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
}

export function useRotateWebhookSecret() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; secret: string }, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/webhooks/endpoints/${id}/rotate-secret`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
}

export function useWebhookEvents(filter?: { eventType?: WebhookEventType; limit?: number }) {
  const params = new URLSearchParams();
  if (filter?.eventType) params.set("eventType", filter.eventType);
  if (filter?.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return useQuery<WebhookEventSummary[]>({
    queryKey: [...EVENTS_KEY, qs],
    queryFn: () => apiRequest<WebhookEventSummary[]>(`/api/webhooks/events${qs ? `?${qs}` : ""}`),
  });
}

export function useWebhookEvent(id: string | undefined) {
  return useQuery<WebhookEventDetail>({
    queryKey: [...EVENTS_KEY, "detail", id],
    queryFn: () => apiRequest<WebhookEventDetail>(`/api/webhooks/events/${id}`),
    enabled: Boolean(id),
  });
}

export function useWebhookActivity(hours = 6) {
  return useQuery<WebhookActivity>({
    queryKey: [...ACTIVITY_KEY, hours],
    queryFn: () => apiRequest<WebhookActivity>(`/api/webhooks/activity?hours=${hours}`),
    refetchInterval: 30_000,
  });
}
