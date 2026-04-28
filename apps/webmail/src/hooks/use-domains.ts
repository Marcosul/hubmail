"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest, ApiError, getActiveWorkspaceId } from "@/api/rest/generic";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export interface Domain {
  id: string;
  name: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  dnsCheckedAt: string | null;
  mailboxCount: number;
  createdAt: string;
}

export interface DomainPlanInfo {
  used: number;
  limit: number;
  mailboxesUsed: number;
  mailboxesLimit: number;
}

export interface CreateDomainResponse extends Domain {
  stalwart?: { synced: boolean; detail?: string; queued?: boolean };
}

export interface DnsSetupRow {
  id: string;
  label: string;
  type: string;
  host: string;
  value: string;
  priority?: number;
  source: "hubmail" | "hint" | "stalwart";
}

export interface DomainSetupPayload {
  domain: {
    id: string;
    name: string;
    status: string;
    dnsCheckedAt: string | null;
  };
  stalwartManagementConfigured: boolean;
  stalwartZoneFile: string | null;
  stalwartError?: string;
  records: DnsSetupRow[];
  docsUrl: string;
}

const KEY = ["domains"] as const;
const PLAN_KEY = ["domains", "plan"] as const;

export function domainSetupQueryKey(domainId: string) {
  return [...KEY, "setup", domainId] as const;
}

export function useDomains() {
  return useQuery<Domain[]>({
    queryKey: KEY,
    queryFn: () => apiRequest<Domain[]>("/api/domains"),
  });
}

export function useDomainPlanInfo() {
  return useQuery<DomainPlanInfo>({
    queryKey: PLAN_KEY,
    queryFn: () => apiRequest<DomainPlanInfo>("/api/domains/plan"),
  });
}

export function useCreateDomain() {
  const qc = useQueryClient();
  return useMutation<CreateDomainResponse, Error, { name: string; aliases?: string[] }>({
    mutationFn: (body) =>
      apiRequest<CreateDomainResponse>("/api/domains", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDomainSetup(domainId: string | null, enabled: boolean) {
  return useQuery<DomainSetupPayload>({
    queryKey: domainId ? domainSetupQueryKey(domainId) : [...KEY, "setup", "none"],
    queryFn: () => apiRequest<DomainSetupPayload>(`/api/domains/${domainId}/setup`),
    enabled: Boolean(domainId) && enabled,
  });
}

export function useVerifyDomain() {
  const qc = useQueryClient();
  return useMutation<Domain, Error, string>({
    mutationFn: (id) => apiRequest<Domain>(`/api/domains/${id}/verify`, { method: "POST" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: domainSetupQueryKey(id) });
    },
  });
}

export function useDeleteDomain() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) => apiRequest(`/api/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PLAN_KEY });
    },
  });
}

export type DomainDeleteEvent =
  | { step: "plan"; name: string; mailboxes: number; stalwart: boolean }
  | { step: "mailbox"; address: string; status: "start" | "done" | "error" | "skipped"; detail?: string }
  | { step: "dkim"; status: "start" | "done" | "error"; count?: number; detail?: string }
  | { step: "domain_server"; status: "start" | "done" | "error"; detail?: string }
  | { step: "database"; status: "start" | "done" }
  | { step: "complete"; mailboxesRemoved: number; stalwartErrors: string[] }
  | { step: "error"; detail: string };

export async function deleteDomainStream(
  id: string,
  onEvent: (e: DomainDeleteEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {};
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    /* ignore */
  }
  const ws = getActiveWorkspaceId();
  if (ws) headers["X-Workspace-Id"] = ws;

  const res = await apiFetch(`/api/domains/${id}`, {
    method: "DELETE",
    headers,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      /* keep text */
    }
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : text || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  if (!res.body) throw new Error("Stream sem corpo");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as DomainDeleteEvent);
        } catch {
          /* skip malformed line */
        }
      }
      nl = buffer.indexOf("\n");
    }
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as DomainDeleteEvent);
    } catch {
      /* ignore */
    }
  }
}
