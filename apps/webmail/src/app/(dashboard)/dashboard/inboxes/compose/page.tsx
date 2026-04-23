import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ComposePage() {
  return (
    <DashboardShell title="Compose" subtitle="New message">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex gap-2">
          <Link href="/dashboard/inboxes/unified" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Cancel
          </Link>
        </div>
        <input
          placeholder="To"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
        />
        <input
          placeholder="Subject"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
        />
        <textarea
          placeholder="Message"
          rows={14}
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
        />
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Send
        </button>
      </div>
    </DashboardShell>
  );
}
