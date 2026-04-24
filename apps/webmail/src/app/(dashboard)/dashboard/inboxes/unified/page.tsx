"use client";

import Link from "next/link";
import { Mail, RefreshCw, Star, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  InboxComposeDock,
  InboxComposeProvider,
  InboxComposeTrigger,
} from "@/components/inboxes/inbox-compose-provider";
import { useMailFolders, useMailboxes, useThreads } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";

function formatRelative(dateString: string | Date) {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function UnifiedInboxPage() {
  return (
    <InboxComposeProvider>
      <UnifiedInboxContent />
    </InboxComposeProvider>
  );
}

function UnifiedInboxContent() {
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
    return [...folders].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </button>
          <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400">
            <Tag className="size-3.5" aria-hidden />
            Labels
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {sortedFolders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">Sem pastas disponíveis</p>
          ) : null}
          {sortedFolders.map((folder) => {
            const active = folder.id === currentFolderId;
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
                <span className="truncate">{folder.name}</span>
                {folder.unreadEmails > 0 ? (
                  <span className="ml-2 shrink-0 rounded bg-neutral-900 px-1.5 text-[10px] font-medium text-white dark:bg-white dark:text-neutral-900">
                    {folder.unreadEmails}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          title="Unified inbox"
          subtitle={activeMailbox ? activeMailbox.address : "Associe uma mailbox para ver mensagens"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/inboxes/new"
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
              >
                + Add mailbox
              </Link>
            </div>
          }
        >
          <div className="min-h-[560px]">
            {loadingMailboxes || !activeMailbox ? (
              <EmptyState loading={loadingMailboxes} />
            ) : (
              <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
                <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {activeMailbox.address}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
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
                />

                <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-hub-border dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5" />
                    <span>{page?.threads.length ?? 0} threads</span>
                  </div>
                  <span>{folders?.find((f) => f.id === currentFolderId)?.name ?? ""}</span>
                </footer>
              </section>
            )}
          </div>
        </DashboardShell>
      </div>
      <InboxComposeDock mailboxId={activeMailbox?.id} />
    </div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 p-8 text-center dark:border-hub-border dark:bg-[#0f0f0f]">
      <Mail className="size-8 text-neutral-400" aria-hidden />
      {loading ? (
        <p className="text-sm text-neutral-500">A carregar mailboxes…</p>
      ) : (
        <>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nenhum mailbox associado ainda
          </p>
          <Link
            href="/dashboard/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Associar mailbox
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
};

function ThreadList({ loading, mailboxId, threads }: ThreadListProps) {
  if (loading) {
    return <p className="px-3 py-12 text-center text-sm text-neutral-500">A sincronizar com Stalwart…</p>;
  }
  if (!threads.length) {
    return <p className="px-3 py-12 text-center text-sm text-neutral-500">Sem mensagens nesta pasta</p>;
  }
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
      {threads.map((thread) => (
        <li key={thread.id}>
          <Link
            href={`/dashboard/inboxes/${encodeURIComponent(mailboxId)}/inbox?threadId=${encodeURIComponent(thread.id)}`}
            className={cn(
              "grid w-full grid-cols-[20px_minmax(0,220px)_minmax(0,1fr)_88px] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5",
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
                {thread.from.name || thread.from.email || "(sem remetente)"}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {thread.from.email}
              </p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-neutral-700 dark:text-neutral-300">{thread.subject}</p>
              {thread.preview ? (
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {thread.preview}
                </p>
              ) : null}
            </div>
            <span className="text-right text-xs text-neutral-500 dark:text-neutral-400">
              {formatRelative(thread.receivedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
