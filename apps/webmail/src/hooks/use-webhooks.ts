"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import type {
  Webhook,
  WebhookActivity,
  WebhookCatalogItem,
  WebhookEventDetail,
  WebhookEventSummary,
  WebhookEventType,
  WebhookWithSecret,
} from "@hubmail/types";

const ENDPOINTS_KEY = ["webhook-endpoints"] as const;
const EVENTS_KEY = ["webhook-events"] as const;
const CATALOG_KEY = ["webhook-catalog"] as const;
const ACTIVITY_KEY = ["webhook-activity"] as const;

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
  enabled?: boolean;
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
