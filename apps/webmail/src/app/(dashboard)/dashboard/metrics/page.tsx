import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function MetricsPage() {
  return (
    <DashboardShell
      title="Metrics"
      subtitle="Last 24 hours"
      actions={
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            defaultValue="24h"
          >
            <option value="24h">Last 24 hours</option>
          </select>
          <select
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            defaultValue="tz"
          >
            <option value="tz">America/Sao_Paulo</option>
          </select>
        </div>
      }
    >
      <div className="mb-6 rounded-lg border border-emerald-800/40 bg-emerald-950/25 px-4 py-3 dark:bg-emerald-950/40">
        <p className="text-sm font-medium text-emerald-100">Score: 100 — Excellent</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-emerald-900/50">
          <div className="h-full w-full rounded-full bg-emerald-400" />
        </div>
      </div>

      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-900 dark:text-white">0</span> sent ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0</span> delivered ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0%</span> delivery ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0</span> received ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0</span> bounced ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0</span> complained ·{" "}
        <span className="font-medium text-neutral-900 dark:text-white">0</span> rejected
      </p>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-6 dark:border-hub-border dark:bg-[#141414]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Email activity</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">10-min email volume for the last 24 hours</p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-6 text-sm">
          <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span className="size-2 rounded-full bg-blue-500" /> Sent: 0
          </span>
          <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span className="size-2 rounded-full bg-emerald-500" /> Received: 0
          </span>
          <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span className="size-2 rounded-full bg-amber-500" /> Complained: 0
          </span>
          <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span className="size-2 rounded-full bg-red-500" /> Bounced: 0
          </span>
        </div>
        <div className="flex h-48 items-end justify-between gap-1 border-t border-neutral-200 pt-4 dark:border-hub-border">
          {["4 PM", "8 PM", "12 AM", "4 AM", "8 AM", "12 PM", "4 PM"].map((t) => (
            <div key={t} className="flex flex-1 flex-col items-center gap-2">
              <div className="h-28 w-full max-w-[28px] rounded-sm bg-neutral-200/80 dark:bg-neutral-800/80" />
              <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
