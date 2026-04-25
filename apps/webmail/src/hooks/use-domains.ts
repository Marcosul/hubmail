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

const KEY = ["domains"] as const;
const PLAN_KEY = ["domains", "plan"] as const;

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
  return useMutation<Domain, Error, string>({
    mutationFn: (name) => apiRequest<Domain>("/api/domains", { method: "POST", body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVerifyDomain() {
  const qc = useQueryClient();
  return useMutation<Domain, Error, string>({
    mutationFn: (id) => apiRequest<Domain>(`/api/domains/${id}/verify`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
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
