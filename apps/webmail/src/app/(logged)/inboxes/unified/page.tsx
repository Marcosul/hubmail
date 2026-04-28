"use client";

import Link from "next/link";
import { Mail, RefreshCw, Star, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxComposeTrigger } from "@/components/inboxes/inbox-compose-provider";
import { useMailFolders, useMailboxes, useThreads } from "@/hooks/use-mail";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import { compareFoldersByRole, getDisplayFolderName } from "@/lib/inbox-routes";
import { cn } from "@/lib/utils";

function formatRelative(dateString: string | Date, locale: AppLocale) {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const dateLocale = getLocaleDateFormat(locale);
  if (diff < oneDay) {
    return date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString(dateLocale, { weekday: "short" });
  }
  return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
}

export default function UnifiedInboxPage() {
  const { locale, messages } = useI18n();
  const copy = messages.inboxes;
  const { data: mailboxes, isLoading: loadingMailboxes } = useMailboxes();
  const activeMailbox = mailboxes?.[0];
  const { data: folders } = useMailFolders(activeMailbox?.id);
  const [folderId, setFolderId] = useState<string | undefined>();
  const currentFolderId = folderId ?? folders?.find((f) => f.role === "inbox")?.id ?? folders?.[0]?.id;
  const { data: page, isLoading: loadingThreads, refetch } = useThreads(activeMailbox?.id, {
    folderId: currentFolderId,
    limit: 30,
  });

  const sortedFolders = useMemo(() => {
    if (!folders) return [];
    return [...folders].sort(compareFoldersByRole);
  }, [folders]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 dark:border-hub-border dark:bg-[#0f0f0f] lg:flex">
        <div className="border-b border-neutral-200 p-3 dark:border-hub-border">
          <InboxComposeTrigger />
        </div>
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10"
            aria-label={copy.refresh}
          >
            <RefreshCw className="size-4" />
          </button>
          <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400">
            <Tag className="size-3.5" aria-hidden />
            {copy.labels}
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {sortedFolders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">{copy.noFolders}</p>
          ) : null}
          {sortedFolders.map((folder) => {
            const active = folder.id === currentFolderId;
            const role = (folder.role ?? "").toLowerCase();
            const isDrafts =
              role === "drafts" ||
              role === "draft" ||
              folder.name.toLowerCase().includes("draft");
            const badge = isDrafts ? folder.totalEmails : folder.unreadEmails;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFolderId(folder.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                  active
                    ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
                )}
              >
                <span className="truncate">{getDisplayFolderName(folder, locale)}</span>
                {badge > 0 ? (
                  <span className="ml-2 shrink-0 rounded bg-neutral-900 px-1.5 text-[10px] font-medium text-white dark:bg-white dark:text-neutral-900">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          title={copy.unifiedInbox}
          subtitle={activeMailbox ? activeMailbox.address : copy.noMailboxSubtitle}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/inboxes/new"
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {copy.addMailbox}
              </Link>
            </div>
          }
        >
          <div className="min-h-[560px]">
            {loadingMailboxes || !activeMailbox ? (
              <EmptyState loading={loadingMailboxes} />
            ) : (
              <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
                <header className="flex flex-col gap-3 border-b border-neutral-200 px-3 py-2 dark:border-hub-border sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {activeMailbox.address}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="w-full lg:hidden">
                      <InboxComposeTrigger />
                    </div>
                    <select
                      value={currentFolderId}
                      onChange={(event) => setFolderId(event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white lg:hidden"
                      aria-label={copy.labels}
                    >
                      {sortedFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {getDisplayFolderName(folder, locale)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 dark:border-hub-border dark:text-neutral-300 lg:hidden"
                    >
                      {copy.refresh}
                    </button>
                    <span>
                      {loadingThreads ? "…" : `${page?.threads.length ?? 0} / ${page?.total ?? 0}`}
                    </span>
                  </div>
                </header>

                <ThreadList
                  loading={loadingThreads}
                  mailboxId={activeMailbox.id}
                  folderSlug={folders?.find((f) => f.id === currentFolderId)?.role ?? "inbox"}
                  threads={page?.threads ?? []}
                  locale={locale}
                />

                <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-hub-border dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5" />
                    <span>
                      {page?.threads.length ?? 0} {copy.threads}
                    </span>
                  </div>
                  <span>{folders?.find((f) => f.id === currentFolderId)?.name ?? ""}</span>
                </footer>
              </section>
            )}
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  const { messages } = useI18n();
  const copy = messages.inboxes;
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 p-8 text-center dark:border-hub-border dark:bg-[#0f0f0f]">
      <Mail className="size-8 text-neutral-400" aria-hidden />
      {loading ? (
        <p className="text-sm text-neutral-500">{copy.loading}</p>
      ) : (
        <>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {copy.noMailbox}
          </p>
          <Link
            href="/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            {copy.associateMailbox}
          </Link>
        </>
      )}
    </div>
  );
}

type ThreadListProps = {
  loading: boolean;
  mailboxId: string;
  folderSlug: string;
  threads: NonNullable<ReturnType<typeof useThreads>["data"]>["threads"];
  locale: AppLocale;
};

function ThreadList({ loading, mailboxId, threads, locale }: ThreadListProps) {
  const { messages } = useI18n();
  const copy = messages.inboxes;
  if (loading) {
    return <p className="px-3 py-12 text-center text-sm text-neutral-500">{copy.sync}</p>;
  }
  if (!threads.length) {
    return <p className="px-3 py-12 text-center text-sm text-neutral-500">{copy.noMessagesInFolder}</p>;
  }
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
      {threads.map((thread) => (
        <li key={thread.id}>
          <Link
            href={`/inboxes/${encodeURIComponent(mailboxId)}/inbox?threadId=${encodeURIComponent(thread.id)}`}
            className={cn(
              "grid w-full grid-cols-[20px_minmax(0,1fr)_72px] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 sm:grid-cols-[20px_minmax(0,180px)_minmax(0,1fr)_72px] xl:grid-cols-[20px_minmax(0,220px)_minmax(0,1fr)_88px] dark:hover:bg-white/5",
              thread.unread && "bg-neutral-50/70 font-medium dark:bg-white/[0.03]",
            )}
          >
            <Star
              className={cn(
                "size-4",
                thread.starred ? "fill-yellow-400 text-yellow-500" : "text-neutral-400",
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-neutral-900 dark:text-neutral-100">
                {thread.from.name || thread.from.email || copy.noSender}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {thread.from.email}
              </p>
            </div>
            <div className="col-start-2 col-end-4 min-w-0 sm:col-auto">
              <p className="truncate text-neutral-700 dark:text-neutral-300">{thread.subject}</p>
              {thread.preview ? (
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {thread.preview}
                </p>
              ) : null}
            </div>
            <span className="col-start-3 row-start-1 text-right text-xs text-neutral-500 dark:text-neutral-400 sm:col-auto sm:row-auto">
              {formatRelative(thread.receivedAt, locale)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
