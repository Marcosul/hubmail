import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function WebhooksPage() {
  return (
    <DashboardShell
      title="Webhooks"
      subtitle="Manage webhook endpoints and monitor delivery."
      actions={
        <button
          type="button"
          className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
        >
          + Add endpoint
        </button>
      }
    >
      <div className="mb-6 flex gap-6 border-b border-neutral-200 dark:border-hub-border">
        {(["Endpoints", "Event catalog", "Logs", "Activity"] as const).map((t, i) => (
          <span
            key={t}
            className={
              i === 0
                ? "-mb-px border-b-2 border-neutral-900 pb-3 text-sm font-medium text-neutral-900 dark:border-white dark:text-white"
                : "-mb-px border-b-2 border-transparent pb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400"
            }
          >
            {t}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
          <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400">
            <span className="flex-1">Endpoint</span>
            <span className="w-28 text-right">Error rate</span>
          </div>
          <div className="px-4 py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Set up an endpoint to get started. For a list of events you can subscribe to, see the Event catalog tab.
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-hub-border">
            <span>Showing 0 items</span>
            <div className="flex gap-1">
              <button type="button" className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-white/10" aria-label="Previous page">
                ‹
              </button>
              <button type="button" className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-white/10" aria-label="Next page">
                ›
              </button>
            </div>
          </div>
        </div>
    </DashboardShell>
  );
}
