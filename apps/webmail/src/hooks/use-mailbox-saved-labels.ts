"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MailboxSavedLabel } from "@hubmail/types";
import { apiRequest } from "@/api/rest/generic";

export const mailboxSavedLabelsQueryKey = (mailboxId: string | undefined) =>
  ["mailbox-saved-labels", mailboxId] as const;

export function useMailboxSavedLabels(mailboxId: string | undefined) {
  return useQuery<MailboxSavedLabel[]>({
    queryKey: mailboxSavedLabelsQueryKey(mailboxId),
    queryFn: () =>
      apiRequest<MailboxSavedLabel[]>(
        `/api/mailboxes/${encodeURIComponent(mailboxId!)}/saved-labels`,
      ),
    enabled: Boolean(mailboxId),
  });
}

export function useAddMailboxSavedLabels(mailboxId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (raw: string) =>
      apiRequest<MailboxSavedLabel[]>(
        `/api/mailboxes/${encodeURIComponent(mailboxId!)}/saved-labels`,
        { method: "POST", body: { raw } },
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: mailboxSavedLabelsQueryKey(mailboxId) });
    },
  });
}

export function useRemoveMailboxSavedLabel(mailboxId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      apiRequest<{ ok?: boolean }>(
        `/api/mailboxes/${encodeURIComponent(mailboxId!)}/saved-labels/${encodeURIComponent(labelId)}`,
        { method: "DELETE" },
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: mailboxSavedLabelsQueryKey(mailboxId) });
    },
  });
}
