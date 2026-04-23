import { Crown } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DomainsPage() {
  return (
    <DashboardShell title="Domains" subtitle="Manage your custom domains for sending emails.">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-3 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 size-5 text-amber-500" aria-hidden />
          <p className="text-sm text-neutral-200">
            <span className="font-semibold text-amber-200">Premium feature.</span> Upgrade to use custom domains for
            sending at scale.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/10"
        >
          Upgrade plan
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 py-24 text-center dark:border-hub-border">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <span className="text-2xl" aria-hidden>
            🌐
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">No domains configured</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          Add your first domain to start sending email from your own domain.
        </p>
      </div>
    </DashboardShell>
  );
}
