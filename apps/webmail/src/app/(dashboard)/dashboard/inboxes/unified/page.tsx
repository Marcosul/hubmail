import Link from "next/link";
import { Pencil, RefreshCw, Tag } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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
];

export default function UnifiedInboxPage() {
  return (
    <div className="flex min-h-0 flex-1">
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

      <div className="flex min-w-0 flex-1 flex-col">
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
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 py-20 text-neutral-500 dark:border-hub-border dark:text-neutral-500">
            No threads found
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}
