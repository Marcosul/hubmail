import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function PodsPage() {
  return (
    <DashboardShell
      title="Pods"
      subtitle="Manage isolated workspaces for multi-tenant applications."
      actions={
        <Link
          href="/dashboard/pods/new"
          className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
        >
          + Create pod
        </Link>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Name</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Created</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200 dark:border-hub-border">
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">Default pod</td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">Apr 23, 2026</td>
              <td className="px-4 py-3">
                <button type="button" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select className="rounded border border-neutral-200 bg-white px-2 py-1 dark:border-hub-border dark:bg-hub-card dark:text-white" defaultValue="30">
              <option>30</option>
            </select>
          </div>
          <span>1 to 1</span>
        </div>
      </div>
    </DashboardShell>
  );
}
