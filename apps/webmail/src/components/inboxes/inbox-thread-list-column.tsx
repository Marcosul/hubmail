"use client";

import { useEffect, useMemo } from "react";
import { Star } from "lucide-react";
import { useThreads } from "@/hooks/use-mail";
import { getLocaleDateFormat } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import type { ThreadSummary } from "@hubmail/types";
import { cn } from "@/lib/utils";

type ListCopy = {
  sync: string;
  searchNoResults: string;
  noMessagesInFolder: string;
  noSender: string;
  labelsNoMatch?: string;
};

function formatRelative(dateString: string | Date, locale: AppLocale) {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const dateLocale = getLocaleDateFormat(locale);
  if (diff < oneDay) return date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * oneDay) return date.toLocaleDateString(dateLocale, { weekday: "short" });
  return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
}

type InboxThreadListColumnProps = {
  mailboxId: string | undefined;
  folderId: string | undefined;
  search: string | undefined;
  selectedThreadId: string;
  onSelectThread: (thread: ThreadSummary) => void;
  locale: AppLocale;
  copy: ListCopy;
  limit?: number;
  cursor?: number;
  /** Hide the small "n / total" bar on top of the list (toolbar shows counts instead). */
  hideSummaryRow?: boolean;
  /** Client-side filter on the current page (API has no unread-only filter). */
  clientFilter?: "all" | "unread";
  /** Match threads whose JMAP label list includes this name (case-insensitive). */
  labelFilter?: string | null;
  /**
   * Quando true, reporta em `onUnreadInViewChange` quantas linhas da página estão não lidas,
   * para alinhar o badge da pasta com a lista (JMAP `unreadEmails` pode atrasar).
   */
  unreadHintEnabled?: boolean;
  onUnreadInViewChange?: (count: number | null) => void;
  /** Pasta Rascunhos: reporta `page.total` para o badge (rascunhos usam $seen → unread=0). */
  totalHintEnabled?: boolean;
  onFolderTotalHintChange?: (count: number | null) => void;
};

/**
 * Só este painel (e não o leitor de thread/compose) re-renderiza quando a lista
 * de e-mails muda (SSE, polling, refetch).
 */
export function InboxThreadListColumn({
  mailboxId,
  folderId,
  search,
  selectedThreadId,
  onSelectThread,
  locale,
  copy,
  limit = 30,
  cursor = 0,
  hideSummaryRow = false,
  clientFilter = "all",
  labelFilter = null,
  unreadHintEnabled = false,
  onUnreadInViewChange,
  totalHintEnabled = false,
  onFolderTotalHintChange,
}: InboxThreadListColumnProps) {
  const { data: page, isPending, isFetching } = useThreads(mailboxId, {
    folderId,
    limit,
    cursor,
    search,
  });

  const displayThreads = useMemo(() => {
    let list =
      clientFilter === "unread"
        ? (page?.threads ?? []).filter((t) => t.unread)
        : (page?.threads ?? []);
    const needle = labelFilter?.trim().toLowerCase();
    if (needle) {
      list = list.filter((t) =>
        (t.labels ?? []).some((l) => l.toLowerCase() === needle),
      );
    }
    return list;
  }, [page?.threads, clientFilter, labelFilter]);

  useEffect(() => {
    if (!onUnreadInViewChange) return;
    if (!unreadHintEnabled) {
      onUnreadInViewChange(null);
      return;
    }
    if (isPending) {
      return;
    }
    if (!page?.threads?.length) {
      onUnreadInViewChange(0);
      return;
    }
    const n = displayThreads.filter((t) => t.unread).length;
    onUnreadInViewChange(n);
  }, [unreadHintEnabled, displayThreads, onUnreadInViewChange, page?.threads, isPending]);

  useEffect(() => {
    if (!onFolderTotalHintChange) return;
    if (!totalHintEnabled) {
      onFolderTotalHintChange(null);
      return;
    }
    if (isPending) return;
    onFolderTotalHintChange(page?.total ?? 0);
  }, [totalHintEnabled, page?.total, isPending, onFolderTotalHintChange]);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
      {!hideSummaryRow ? (
        <div
          className="flex items-center justify-end gap-2 border-b border-neutral-200 px-3 py-1.5 text-xs tabular-nums text-neutral-500 dark:border-hub-border"
          aria-live="polite"
        >
          {isPending ? "…" : `${page?.threads.length ?? 0} / ${page?.total ?? 0}`}
          {isFetching && !isPending ? (
            <span
              className="inline-block size-1.5 animate-pulse rounded-full bg-neutral-400"
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}
      {isPending ? (
        <p className="px-3 py-12 text-center text-sm text-neutral-500">{copy.sync}</p>
      ) : !page || page.threads.length === 0 ? (
        <p className="px-3 py-12 text-center text-sm text-neutral-500">
          {search ? copy.searchNoResults : copy.noMessagesInFolder}
        </p>
      ) : displayThreads.length === 0 ? (
        <p className="px-3 py-12 text-center text-sm text-neutral-500">
          {labelFilter?.trim()
            ? (copy.labelsNoMatch ?? copy.searchNoResults)
            : copy.searchNoResults}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
          {displayThreads.map((thread) => {
            const active = thread.id === selectedThreadId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onSelectThread(thread)}
                  className={cn(
                    "grid w-full grid-cols-[20px_8px_1fr_auto] items-center gap-2 px-3 py-2.5 text-left text-sm",
                    active
                      ? "bg-neutral-100 dark:bg-white/10"
                      : "hover:bg-neutral-50 dark:hover:bg-white/5",
                  )}
                >
                  <Star
                    className={cn(
                      "size-4",
                      thread.starred ? "fill-yellow-400 text-yellow-500" : "text-neutral-400",
                    )}
                  />
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      thread.unread ? "bg-blue-500" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-neutral-900 dark:text-white",
                        thread.unread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {thread.from.name || thread.from.email || copy.noSender}
                    </p>
                    <p className="truncate text-neutral-500 dark:text-neutral-400">{thread.subject}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatRelative(thread.receivedAt, locale)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
