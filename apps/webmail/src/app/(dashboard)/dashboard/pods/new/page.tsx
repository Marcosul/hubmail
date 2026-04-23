import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function NewPodPage() {
  return (
    <DashboardShell title="Create pod" subtitle="Create an isolated workspace.">
      <div className="mx-auto max-w-md space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Name
          <input className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white" placeholder="e.g. Production" />
        </label>
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/pods" className="flex-1 rounded-md border border-neutral-200 py-2 text-center text-sm dark:border-hub-border dark:hover:bg-white/5">
            Cancel
          </Link>
          <button type="button" className="flex-1 rounded-md bg-neutral-900 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">
            Create
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
