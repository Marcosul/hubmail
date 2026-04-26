"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";

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
