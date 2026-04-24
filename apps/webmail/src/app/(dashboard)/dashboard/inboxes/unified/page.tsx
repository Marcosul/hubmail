import Link from "next/link";
import { Mail, Pencil, RefreshCw, Star, Tag } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { cn } from "@/lib/utils";

const folders = [
  { id: "all", label: "All inboxes", active: true },
  { id: "starred", label: "Starred", active: false },
  { id: "sent", label: "Sent", active: false },
  { id: "drafts", label: "Drafts", active: false },
  { id: "important", label: "Important", active: false },
  { id: "scheduled", label: "Scheduled", active: false },
  { id: "allmail", label: "All mail", active: false },
  { id: "spam", label: "Spam", active: false },
  { id: "trash", label: "Trash", active: false },
];

const threads = [
  { id: "1", from: "AgentMail", subject: "(no subject)", inbox: "agentgithubs4o@agentmail.to", time: "10:59 AM", unread: false },
  { id: "2", from: "Ops", subject: "SMTP health check completed", inbox: "admin@hubmail.to", time: "9:40 AM", unread: true },
  { id: "3", from: "Billing", subject: "Invoice available for April", inbox: "financeiro@hubmail.to", time: "8:17 AM", unread: true },
  { id: "4", from: "Supabase", subject: "Project credentials updated", inbox: "suporte@hubmail.to", time: "Yesterday", unread: false },
];

export default function UnifiedInboxPage() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 dark:border-hub-border dark:bg-[#0f0f0f] lg:flex">
        <div className="border-b border-neutral-200 p-3 dark:border-hub-border">
          <Link
            href="/dashboard/inboxes/compose"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            <Pencil className="size-4" aria-hidden />
            Compose
          </Link>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
          <button type="button" className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-white/10"
          >
            <Tag className="size-3.5" aria-hidden />
            Labels +
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cn(
                "flex w-full rounded-md px-3 py-2 text-left text-sm",
                f.active
                  ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          title="Unified inbox"
          subtitle="Threads across all inboxes"
          actions={
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
          }
        >
          <div className="grid min-h-[560px] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
              <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Inboxes &gt; Sent</div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>1-30</span>
                  <button
                    type="button"
                    className="rounded px-1 py-0.5 hover:bg-neutral-100 dark:hover:bg-white/10"
                    aria-label="Previous page"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="rounded px-1 py-0.5 hover:bg-neutral-100 dark:hover:bg-white/10"
                    aria-label="Next page"
                  >
                    {">"}
                  </button>
                </div>
              </header>

              <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      className={cn(
                        "grid w-full grid-cols-[20px_minmax(0,220px)_minmax(0,1fr)_88px] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5",
                        thread.unread && "bg-neutral-50/70 font-medium dark:bg-white/[0.03]",
                      )}
                    >
                      <Star className="size-4 text-neutral-400" />
                      <div className="min-w-0">
                        <p className="truncate text-neutral-900 dark:text-neutral-100">{thread.from}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{thread.inbox}</p>
                      </div>
                      <p className="truncate text-neutral-700 dark:text-neutral-300">{thread.subject}</p>
                      <span className="text-right text-xs text-neutral-500 dark:text-neutral-400">{thread.time}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-hub-border dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5" />
                  <span>4 threads</span>
                </div>
                <span>Includes all inboxes</span>
              </footer>
            </section>

            <div className="hidden lg:block">
              <EmailComposerCard />
            </div>

            <div className="lg:hidden">
              <EmailComposerCard compact />
            </div>
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}
