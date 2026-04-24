"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import type {
  EmailMessage,
  MailboxSummary,
  MailFolderSummary,
  PatchMessageInput,
  SendMailInput,
  SendMailResult,
  ThreadPage,
} from "@hubmail/types";

type FolderListResult = MailFolderSummary[];

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const str = usp.toString();
  return str ? `?${str}` : "";
}

export function useMailboxes(): UseQueryResult<MailboxSummary[]> {
  return useQuery({
    queryKey: ["mailboxes"],
    queryFn: () => apiRequest<MailboxSummary[]>("/api/mailboxes"),
  });
}

export function useMailFolders(mailboxId: string | undefined) {
  return useQuery<FolderListResult>({
    queryKey: ["mail-folders", mailboxId],
    queryFn: () =>
      apiRequest<FolderListResult>(`/api/mail/mailboxes${buildQuery({ mailboxId: mailboxId! })}`),
    enabled: Boolean(mailboxId),
    staleTime: 60_000,
  });
}

export function useThreads(
  mailboxId: string | undefined,
  options: { folderId?: string; cursor?: number; limit?: number } = {},
) {
  return useQuery<ThreadPage>({
    queryKey: ["mail-threads", mailboxId, options.folderId, options.cursor, options.limit],
    queryFn: () =>
      apiRequest<ThreadPage>(
        `/api/mail/threads${buildQuery({
          mailboxId: mailboxId!,
          folderId: options.folderId,
          cursor: options.cursor,
          limit: options.limit,
        })}`,
      ),
    enabled: Boolean(mailboxId),
    refetchInterval: 30_000,
  });
}

export function useThread(mailboxId: string | undefined, threadId: string | undefined) {
  return useQuery<{ id: string; emailIds: string[]; messages: EmailMessage[] }>({
    queryKey: ["mail-thread", mailboxId, threadId],
    queryFn: () =>
      apiRequest(
        `/api/mail/threads/${encodeURIComponent(threadId!)}${buildQuery({ mailboxId: mailboxId! })}`,
      ),
    enabled: Boolean(mailboxId) && Boolean(threadId),
  });
}

export function useMessage(mailboxId: string | undefined, emailId: string | undefined) {
  return useQuery<EmailMessage>({
    queryKey: ["mail-message", mailboxId, emailId],
    queryFn: () =>
      apiRequest(
        `/api/mail/messages/${encodeURIComponent(emailId!)}/raw${buildQuery({
          mailboxId: mailboxId!,
        })}`,
      ),
    enabled: Boolean(mailboxId) && Boolean(emailId),
  });
}

export function usePatchMessage(): UseMutationResult<
  { ok: boolean },
  Error,
  { emailId: string; mailboxId: string; patch: Omit<PatchMessageInput, "moveToMailbox"> & { moveToMailbox?: string } }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emailId, mailboxId, patch }) =>
      apiRequest<{ ok: boolean }>(`/api/mail/messages/${encodeURIComponent(emailId)}`, {
        method: "PATCH",
        body: { ...patch, mailboxId },
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mail-threads", vars.mailboxId] });
      qc.invalidateQueries({ queryKey: ["mail-thread", vars.mailboxId] });
      qc.invalidateQueries({ queryKey: ["mail-message", vars.mailboxId] });
    },
  });
}

export function useSendMail(): UseMutationResult<SendMailResult, Error, SendMailInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiRequest<SendMailResult>("/api/mail/send", { method: "POST", body: input }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mail-threads", vars.mailboxId] });
    },
  });
}

export function useCreateMailbox() {
  const qc = useQueryClient();
  return useMutation<MailboxSummary, Error, { address: string; password: string; displayName?: string; username?: string }>({
    mutationFn: (body) =>
      apiRequest<MailboxSummary>("/api/mailboxes", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });
}
