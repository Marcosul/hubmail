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
  ThreadSummary,
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
    staleTime: 30_000,
  });
}

export function useThreads(
  mailboxId: string | undefined,
  options: { folderId?: string; cursor?: number; limit?: number; search?: string } = {},
) {
  return useQuery<ThreadPage>({
    queryKey: ["mail-threads", mailboxId, options.folderId, options.cursor, options.limit, options.search],
    queryFn: () =>
      apiRequest<ThreadPage>(
        `/api/mail/threads${buildQuery({
          mailboxId: mailboxId!,
          folderId: options.folderId,
          cursor: options.cursor,
          limit: options.limit,
          q: options.search,
        })}`,
      ),
    enabled: Boolean(mailboxId),
    // SSE invalida o cache em tempo real; polling a 30s é fallback para ambientes
    // sem Redis ou serverless.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
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
    refetchOnWindowFocus: true,
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

type PatchArgs = {
  emailId: string;
  mailboxId: string;
  threadId?: string;
  patch: Omit<PatchMessageInput, "moveToMailbox"> & { moveToMailbox?: string };
};

export function usePatchMessage(): UseMutationResult<{ ok: boolean }, Error, PatchArgs> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emailId, mailboxId, patch }) =>
      apiRequest<{ ok: boolean }>(`/api/mail/messages/${encodeURIComponent(emailId)}`, {
        method: "PATCH",
        body: { ...patch, mailboxId },
      }),

    onMutate: async ({ mailboxId, threadId, patch }) => {
      if (!threadId) return;

      // Cancela refetch em andamento para não sobrescrever o optimistic update
      await qc.cancelQueries({ queryKey: ["mail-threads", mailboxId] });

      const prevThreadsQueries = qc.getQueriesData<ThreadPage>({
        queryKey: ["mail-threads", mailboxId],
      });

      qc.setQueriesData<ThreadPage>(
        { queryKey: ["mail-threads", mailboxId] },
        (old) => {
          if (!old) return old;
          if (patch.delete) {
            return { ...old, threads: old.threads.filter((t) => t.id !== threadId) };
          }
          return {
            ...old,
            threads: old.threads.map((t): ThreadSummary => {
              if (t.id !== threadId) return t;
              return {
                ...t,
                starred: patch.starred !== undefined ? patch.starred : t.starred,
                unread: patch.unread !== undefined ? patch.unread : t.unread,
              };
            }),
          };
        },
      );

      return { prevThreadsQueries };
    },

    onError: (_err, _vars, ctx) => {
      // Rollback em caso de erro
      if (!ctx?.prevThreadsQueries) return;
      for (const [key, data] of ctx.prevThreadsQueries) {
        qc.setQueryData(key, data);
      }
    },

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
      // SSE notifica o backend; aqui invalidamos preventivamente caso SSE falhe
      qc.invalidateQueries({ queryKey: ["mail-threads", vars.mailboxId] });
    },
  });
}

export function useCreateMailbox() {
  const qc = useQueryClient();
  return useMutation<MailboxSummary, Error, { address: string; displayName?: string; username?: string }>({
    mutationFn: (body) =>
      apiRequest<MailboxSummary>("/api/mailboxes", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });
}

export function useRotateMailboxCredential() {
  const qc = useQueryClient();
  return useMutation<
    MailboxSummary,
    Error,
    { mailboxId: string; password: string; username?: string }
  >({
    mutationFn: ({ mailboxId, ...body }) =>
      apiRequest<MailboxSummary>(`/api/mailboxes/${encodeURIComponent(mailboxId)}/rotate-credential`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });
}

export function useDeleteMailbox() {
  const qc = useQueryClient();
  return useMutation<{ ok?: boolean } | MailboxSummary, Error, { mailboxId: string }>({
    mutationFn: ({ mailboxId }) =>
      apiRequest<{ ok?: boolean } | MailboxSummary>(`/api/mailboxes/${encodeURIComponent(mailboxId)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mailboxes"] });
      qc.invalidateQueries({ queryKey: ["mail-folders"] });
      qc.invalidateQueries({ queryKey: ["mail-threads"] });
    },
  });
}
