import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";
import { cn } from "@/lib/utils";

function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-neutral-50/80 dark:border-hub-border dark:bg-[#141414]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default async function OverviewPage() {
  const copy = getMessages(await getServerLocale()).overview;

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">
                {copy.emailActivity}
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {copy.last24h}
              </p>
            </div>
            <select
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
              aria-label={copy.timeRange}
              defaultValue="24h"
            >
              <option value="24h">{copy.hours24}</option>
              <option value="7d">{copy.days7}</option>
            </select>
          </div>
          <div className="mb-6 flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.sent}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">0</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.received}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">0</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.complained}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">0</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.bounced}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">0</span>
            </span>
          </div>
          <div className="flex h-56 items-end justify-between gap-1 border-t border-neutral-200 pt-4 dark:border-hub-border">
            {copy.chartTimes.map((t, index) => (
              <div key={`${t}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                <div className="h-32 w-full max-w-[32px] rounded-sm bg-neutral-200/80 dark:bg-neutral-800/80" />
                <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{t}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.unifiedInbox}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {copy.latestThreads}
                </p>
              </div>
              <Link
                href="/dashboard/inboxes/unified"
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
              >
                {copy.viewAll}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="mb-3 size-10 text-neutral-300 dark:text-neutral-600" aria-hidden />
              <p className="font-medium text-neutral-800 dark:text-neutral-200">{copy.noMessages}</p>
              <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-500">
                {copy.noMessagesDescription}
              </p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.resources}</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{copy.domains}</span>
                  <span className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                    {copy.upgrade}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-300">
                    <span>{copy.inboxes}</span>
                    <span>0 / 25</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div className="h-full w-0 rounded-full bg-neutral-900 dark:bg-white" />
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-neutral-200 p-3 dark:border-hub-border">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">0.0%</p>
                  <p className="text-[10px] font-medium uppercase text-neutral-500">{copy.bounceRate}</p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3 dark:border-hub-border">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">0.0%</p>
                  <p className="text-[10px] font-medium uppercase text-neutral-500">{copy.complainedRate}</p>
                </div>
              </div>
              <div className="mt-4 h-16 rounded-md bg-neutral-100 dark:bg-neutral-900/80" />
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
