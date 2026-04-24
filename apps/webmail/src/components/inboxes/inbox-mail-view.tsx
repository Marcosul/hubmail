import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Bookmark,
  CalendarClock,
  FileEdit,
  Flag,
  Inbox,
  Mail,
  Mails,
  RefreshCw,
  Send,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  InboxComposeDock,
  InboxComposeProvider,
  InboxComposeTrigger,
} from "@/components/inboxes/inbox-compose-provider";
import { getFolderLabel, inboxFolderHref } from "@/lib/inbox-routes";
import { cn } from "@/lib/utils";

type ThreadRow = { id: string; from: string; subject: string; time: string; unread: boolean };

const mailFolders: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: "inbox", label: "Inbox", icon: Inbox },
  { slug: "starred", label: "Starred", icon: Star },
  { slug: "sent", label: "Sent", icon: Send },
  { slug: "drafts", label: "Drafts", icon: FileEdit },
  { slug: "important", label: "Important", icon: Bookmark },
  { slug: "scheduled", label: "Scheduled", icon: CalendarClock },
  { slug: "all-mail", label: "All mail", icon: Mails },
  { slug: "spam", label: "Spam", icon: Mail },
  { slug: "trash", label: "Trash", icon: Trash2 },
];

function getThreadsForFolder(_inboxId: string, folderSlug: string): ThreadRow[] {
  if (folderSlug === "sent") {
    return [
      { id: "1", from: "AgentMail", subject: "(no subject)", time: "10:59 AM", unread: false },
    ];
  }
  return [];
}

type InboxMailViewProps = {
  inboxId: string;
  folderSlug: string;
};

function InboxBreadcrumb({ inboxId, folderLabel }: { inboxId: string; folderLabel: string }) {
  return (
    <nav className="text-xs text-neutral-500 dark:text-neutral-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link className="hover:text-neutral-800 dark:hover:text-neutral-300" href="/dashboard/overview">
            Dashboard
          </Link>
        </li>
        <li className="text-neutral-400">/</li>
        <li>
          <Link className="hover:text-neutral-800 dark:hover:text-neutral-300" href="/dashboard/inboxes">
            Inboxes
          </Link>
        </li>
        <li className="text-neutral-400">/</li>
        <li className="text-neutral-600 dark:text-neutral-400">{inboxId}</li>
        <li className="text-neutral-400">/</li>
        <li className="text-neutral-600 dark:text-neutral-400">{folderLabel}</li>
      </ol>
    </nav>
  );
}

export function InboxMailView({ inboxId, folderSlug }: InboxMailViewProps) {
  const folderLabel = getFolderLabel(folderSlug);
  const threads = getThreadsForFolder(inboxId, folderSlug);
  const labelPill = folderSlug.replace(/-/g, " ") || "inbox";

  return (
    <InboxComposeProvider>
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 dark:border-hub-border dark:bg-[#0f0f0f] lg:flex">
        <div className="border-b border-neutral-200 p-3 dark:border-hub-border">
          <InboxComposeTrigger />
        </div>
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
          <button type="button" className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </button>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Inboxes</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {mailFolders.map((f) => {
            const Icon = f.icon;
            const active = f.slug === folderSlug;
            return (
              <Link
                key={f.slug}
                href={inboxFolderHref(inboxId, f.slug)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                  active
                    ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {f.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          title={folderLabel}
          subtitle={inboxId}
          breadcrumb={<InboxBreadcrumb inboxId={inboxId} folderLabel={folderLabel} />}
          actions={
            <>
              <Link
                href="/dashboard/api-keys"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                API keys
              </Link>
              <Link
                href="/dashboard/allow-block"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Allow/Block
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white"
                  defaultValue="all"
                  aria-label="Include filter"
                >
                  <option value="all">Include: All</option>
                </select>
                <select
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white"
                  defaultValue="30"
                  aria-label="Threads per page"
                >
                  <option value="30">Threads per page: 30</option>
                </select>
              </div>
            </>
          }
        >
          <div className="mb-4 flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-hub-border">
            <div className="text-xs text-neutral-500 dark:text-neutral-500">
              Inboxes <span className="text-neutral-400">&gt;</span>{" "}
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{inboxId}</span>{" "}
              <span className="text-neutral-400">&gt;</span> {folderLabel}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                aria-label="Refresh list"
              >
                <RefreshCw className="size-4" />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                <Tag className="size-3.5" />
                <span>Labels +</span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium dark:border-hub-border dark:bg-white/5">
                  {labelPill}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>
                  1 to {Math.max(threads.length, 1)}
                </span>
                <span className="text-neutral-400" aria-hidden>
                  &lt;&lt; &lt; &gt; &gt;&gt;
                </span>
              </div>
            </div>
          </div>

          <div className="min-h-[520px]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
              <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
                {threads.length === 0 ? (
                  <li className="px-3 py-12 text-center text-sm text-neutral-500 dark:text-neutral-500">No messages</li>
                ) : (
                  threads.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        className="grid w-full grid-cols-[20px_20px_1fr_auto] items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5"
                      >
                        <Star className="size-4 text-neutral-400" />
                        <Flag className="size-4 text-neutral-400" />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-white">{thread.from}</p>
                          <p className="text-neutral-500 dark:text-neutral-400">{thread.subject}</p>
                        </div>
                        <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{thread.time}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </DashboardShell>
      </div>
    </div>
    <InboxComposeDock />
    </InboxComposeProvider>
  );
}
