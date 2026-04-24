import { Crown } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export default async function DomainsPage() {
  const copy = getMessages(await getServerLocale()).domains;

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <div className="mb-8 flex flex-col items-stretch justify-between gap-4 rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-3 dark:bg-amber-950/30 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 size-5 text-amber-500" aria-hidden />
          <p className="text-sm text-neutral-200">
            <span className="font-semibold text-amber-200">{copy.premium}</span> {copy.premiumDescription}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/10"
        >
          {copy.upgradePlan}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 py-16 text-center dark:border-hub-border sm:py-24">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <span className="text-2xl" aria-hidden>
            🌐
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{copy.emptyTitle}</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {copy.emptyDescription}
        </p>
      </div>
    </DashboardShell>
  );
}
