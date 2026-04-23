import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function CreateInboxPage() {
  return (
    <DashboardShell title="Create inbox" subtitle="Create a new email inbox for your workspace.">
      <div className="mx-auto max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-hub-border dark:bg-[#141414]">
        <form className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Username (optional)
            </label>
            <input
              id="username"
              name="username"
              placeholder="e.g. sales"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-neutral-400 focus:ring-2 dark:border-hub-border dark:bg-hub-surface dark:text-white"
            />
            <p className="mt-1 flex items-start gap-1 text-xs text-neutral-500">
              Username will be auto-generated if not specified.
            </p>
          </div>
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Domain
            </label>
            <select
              id="domain"
              name="domain"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
              defaultValue="hubmail.to"
            >
              <option value="hubmail.to">hubmail.to (default)</option>
            </select>
          </div>
          <div>
            <label htmlFor="display" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Display name (optional)
            </label>
            <input
              id="display"
              name="display"
              placeholder="e.g. Sales team"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard/inboxes"
              className="flex-1 rounded-md border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
            >
              Cancel
            </Link>
            <button
              type="button"
              className="flex-1 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              + Create inbox
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
