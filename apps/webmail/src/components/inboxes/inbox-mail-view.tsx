"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RefreshCw, Star, Tag, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  InboxComposeDock,
  InboxComposeProvider,
  InboxComposeTrigger,
  useInboxCompose,
} from "@/components/inboxes/inbox-compose-provider";
import { ThreadViewer } from "@/components/inboxes/thread-viewer";
import {
  useMailFolders,
  useMailboxes,
  usePatchMessage,
  useThreads,
} from "@/hooks/use-mail";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import { getFolderLabel, inboxFolderHref } from "@/lib/inbox-routes";
import { cn } from "@/lib/utils";

type InboxMailViewProps = {
  inboxId: string;
  folderSlug: string;
  threadId?: string;
};

function matchFolderBySlug(folders: ReturnType<typeof useMailFolders>["data"], slug: string) {
  if (!folders) return undefined;
  const slugNormalized = slug.replace(/-/g, "");
  return (
    folders.find((f) => (f.role ?? "").toLowerCase() === slugNormalized) ||
    folders.find((f) => f.name.toLowerCase() === slug.replace(/-/g, " "))
  );
}

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

export function InboxMailView({ inboxId, folderSlug, threadId }: InboxMailViewProps) {
  return (
    <InboxComposeProvider>
      <Content inboxId={inboxId} folderSlug={folderSlug} threadId={threadId} />
    </InboxComposeProvider>
  );
}

function Content({ inboxId, folderSlug, threadId }: InboxMailViewProps) {
  const { locale, messages } = useI18n();
  const copy = messages.inboxes;
  const router = useRouter();
  const { data: mailboxes } = useMailboxes();
  const { openCompose } = useInboxCompose();
  const mailbox = useMemo(
    () => mailboxes?.find((m) => m.id === inboxId) ?? mailboxes?.[0],
    [mailboxes, inboxId],
  );
  const { data: folders } = useMailFolders(mailbox?.id);
  const folderMatch = matchFolderBySlug(folders, folderSlug);
  const { data: page, isLoading, refetch } = useThreads(mailbox?.id, {
    folderId: folderMatch?.id,
    limit: 30,
  });
  const patch = usePatchMessage();

  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(threadId);
  const activeThreadId = threadId ?? selectedThreadId;

  const folderLabel = getFolderLabel(folderSlug, locale);
  const labelPill = folderSlug.replace(/-/g, " ") || "inbox";

  const sortedFolders = useMemo(() => {
    if (!folders) return [];
    return [...folders].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [folders]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 dark:border-hub-border dark:bg-[#0f0f0f] lg:flex">
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
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {mailbox?.address.split("@")[0] ?? "inbox"}
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {sortedFolders.map((f) => {
            const slug = (f.role ?? f.name.toLowerCase().replace(/\s+/g, "-")) || "inbox";
            const active = f.id === folderMatch?.id;
            return (
              <Link
                key={f.id}
                href={inboxFolderHref(mailbox?.id ?? inboxId, slug)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                  active
                    ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
                )}
              >
                <span className="truncate">{f.name}</span>
                {f.unreadEmails > 0 ? (
                  <span className="ml-2 shrink-0 rounded bg-neutral-900 px-1.5 text-[10px] font-medium text-white dark:bg-white dark:text-neutral-900">
                    {f.unreadEmails}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          title={folderLabel}
          subtitle={mailbox?.address}
          actions={
            <>
              <Link
                href="/dashboard/api-keys"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {copy.apiKeys}
              </Link>
              <Link
                href="/dashboard/allow-block"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {copy.allowBlock}
              </Link>
            </>
          }
        >
          <div className="mb-4 flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-hub-border">
            <div className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-500">
              {copy.title} <span className="text-neutral-400">&gt;</span>{" "}
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{mailbox?.address}</span>{" "}
              <span className="text-neutral-400">&gt;</span> {folderLabel}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full lg:hidden">
                <InboxComposeTrigger />
              </div>
              <select
                value={folderMatch?.id ?? ""}
                onChange={(event) => {
                  const folder = sortedFolders.find((item) => item.id === event.target.value);
                  if (!folder) return;
                  const slug = (folder.role ?? folder.name.toLowerCase().replace(/\s+/g, "-")) || "inbox";
                  router.push(inboxFolderHref(mailbox?.id ?? inboxId, slug));
                }}
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white lg:hidden"
                aria-label={copy.labels}
              >
                {sortedFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
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
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                <Tag className="size-3.5" />
                <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium dark:border-hub-border dark:bg-white/5">
                  {labelPill}
                </span>
              </div>
              <span className="text-xs text-neutral-500">
                {isLoading ? "…" : `${page?.threads.length ?? 0} / ${page?.total ?? 0}`}
              </span>
            </div>
          </div>

          <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
              {isLoading ? (
                <p className="px-3 py-12 text-center text-sm text-neutral-500">
                  {copy.sync}
                </p>
              ) : page?.threads.length === 0 ? (
                <p className="px-3 py-12 text-center text-sm text-neutral-500">
                  {copy.noMessagesInFolder}
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
                  {page?.threads.map((thread) => {
                    const active = thread.id === activeThreadId;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={cn(
                            "grid w-full grid-cols-[20px_20px_1fr_auto] items-center gap-2 px-3 py-2.5 text-left text-sm",
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
                          <span />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900 dark:text-white">
                              {thread.from.name || thread.from.email || copy.noSender}
                            </p>
                            <p className="truncate text-neutral-500 dark:text-neutral-400">
                              {thread.subject}
                            </p>
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

            <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
              {activeThreadId && mailbox ? (
                <ThreadViewer
                  mailboxId={mailbox.id}
                  threadId={activeThreadId}
                  onDelete={async (emailId) => {
                    await patch.mutateAsync({
                      emailId,
                      mailboxId: mailbox.id,
                      patch: { delete: true },
                    });
                  }}
                  onToggleStar={async (emailId, starred) => {
                    await patch.mutateAsync({
                      emailId,
                      mailboxId: mailbox.id,
                      patch: { starred },
                    });
                  }}
                  onToggleUnread={async (emailId, unread) => {
                    await patch.mutateAsync({
                      emailId,
                      mailboxId: mailbox.id,
                      patch: { unread },
                    });
                  }}
                  onReply={(draft) => openCompose({ ...draft, mailboxId: mailbox.id })}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-12 text-sm text-neutral-500">
                  <Trash2 className="mr-2 size-4" aria-hidden />
                  {copy.selectConversation}
                </div>
              )}
            </section>
          </div>
        </DashboardShell>
      </div>
      <InboxComposeDock mailboxId={mailbox?.id} />
    </div>
  );
}
