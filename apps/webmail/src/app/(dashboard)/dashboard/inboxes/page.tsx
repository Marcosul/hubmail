import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxTableActionsCell } from "@/components/inboxes/inbox-table-actions-cell";
import { InboxTableRow } from "@/components/inboxes/inbox-table-row";

const rows = [
  { inboxId: "admin@hubmail.to", displayName: "Primary" },
] as const;

export default function InboxesPage() {
  return (
    <DashboardShell
      title="Inboxes"
      subtitle="Manage your email inboxes"
      actions={
        <>
          <Link
            href="/dashboard/inboxes/unified"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Unified inbox
          </Link>
          <Link
            href="/dashboard/inboxes/smtp"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            SMTP/IMAP
          </Link>
          <Link
            href="/dashboard/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            + Create inbox
          </Link>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Inbox ID</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Display name</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Created</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Updated</th>
              <th className="w-12 px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <InboxTableRow key={row.inboxId} inboxId={row.inboxId} openFolder="sent">
                <td className="px-4 py-3 font-mono text-xs text-neutral-900 dark:text-neutral-200">{row.inboxId}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.displayName}</td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">—</td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">—</td>
                <InboxTableActionsCell>
                  <button
                    type="button"
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                    aria-label="Row actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </InboxTableActionsCell>
              </InboxTableRow>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              className="rounded border border-neutral-200 bg-white px-2 py-1 text-neutral-900 dark:border-hub-border dark:bg-hub-card dark:text-white"
              defaultValue="30"
              aria-label="Rows per page"
            >
              <option value="30">30</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">1 to 1</span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
