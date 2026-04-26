"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, ArrowRight, Star } from "lucide-react";
import { apiRequest } from "@/api/rest/generic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useDomainPlanInfo } from "@/hooks/use-domains";
import { useMailFolders, useMailboxes, useThreads } from "@/hooks/use-mail";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { MetricsSnapshot, ThreadSummary } from "@hubmail/types";

function formatRelative(dateString: string | Date, locale: AppLocale) {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const dateLocale = getLocaleDateFormat(locale);
  if (diff < oneDay) {
    return date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString(dateLocale, { weekday: "short" });
  }
  return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
}

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

export function DashboardOverview() {
  const { locale, messages } = useI18n();
  const copy = messages.overview;
  const metricsCopy = messages.metrics;
  const inboxCopy = messages.inboxes;
  const [hours, setHours] = useState(24);

  const { data: metrics, isLoading: loadingMetrics } = useQuery<MetricsSnapshot>({
    queryKey: ["metrics", hours],
    queryFn: () => apiRequest<MetricsSnapshot>(`/api/metrics/workspace?hours=${hours}`),
    refetchInterval: 60_000,
  });

  const { data: plan } = useDomainPlanInfo();
  const { data: mailboxes, isLoading: loadingMailboxes } = useMailboxes();
  const firstMailbox = mailboxes?.[0];
  const { data: folders, isLoading: loadingFolders } = useMailFolders(firstMailbox?.id);
  const inboxFolderId = useMemo(
    () => folders?.find((f) => f.role === "inbox")?.id ?? folders?.[0]?.id,
    [folders],
  );
  const { data: threadPage, isLoading: loadingThreads } = useThreads(firstMailbox?.id, {
    folderId: inboxFolderId,
    limit: 5,
  });

  const activityTotal = useMemo(() => {
    if (!metrics) return 0;
    return metrics.sent + metrics.received + metrics.bounced + metrics.complained;
  }, [metrics]);

  const bouncePct =
    activityTotal === 0 || !metrics ? 0 : Math.round((1000 * metrics.bounced) / activityTotal) / 10;
  const complaintPct =
    activityTotal === 0 || !metrics ? 0 : Math.round((1000 * metrics.complained) / activityTotal) / 10;

  const barSeries = useMemo(() => {
    if (!metrics) return [];
    const entries = [
      { key: "sent", value: metrics.sent, color: "bg-blue-500", label: metricsCopy.cards.sent },
      { key: "received", value: metrics.received, color: "bg-emerald-500", label: metricsCopy.cards.received },
      { key: "complained", value: metrics.complained, color: "bg-amber-500", label: metricsCopy.cards.spam },
      { key: "bounced", value: metrics.bounced, color: "bg-red-500", label: metricsCopy.cards.bounced },
    ];
    const max = Math.max(1, ...entries.map((e) => e.value));
    return entries.map((e) => ({ ...e, pct: Math.round((100 * e.value) / max) }));
  }, [metrics, metricsCopy.cards]);

  const mailUsed = plan?.mailboxesUsed ?? mailboxes?.length ?? 0;
  const mailLimit = plan?.mailboxesLimit ?? 3;
  const domainUsed = plan?.used ?? 0;
  const domainLimit = plan?.limit ?? 1;
  const inboxProgressPct = mailLimit === 0 ? 0 : Math.min(100, Math.round((100 * mailUsed) / mailLimit));

  const deliveryTone =
    (metrics?.score ?? 0) >= 95
      ? "bg-emerald-500"
      : (metrics?.score ?? 0) >= 80
        ? "bg-lime-500"
        : (metrics?.score ?? 0) >= 50
          ? "bg-amber-500"
          : "bg-red-500";

  const threads = threadPage?.threads ?? [];

  return (
    <DashboardShell
      title={copy.title}
      subtitle={
        metrics
          ? `${metricsCopy.window}: ${metrics.windowHours}h · ${metricsCopy.emailVolumeDescription}`
          : copy.subtitle
      }
    >
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">
                {copy.emailActivity}
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{copy.last24h}</p>
            </div>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
              aria-label={copy.timeRange}
            >
              <option value={24}>{copy.hours24}</option>
              <option value={168}>{copy.days7}</option>
            </select>
          </div>
          <div className="mb-6 flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.sent}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">
                {loadingMetrics ? "…" : (metrics?.sent ?? 0)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.received}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">
                {loadingMetrics ? "…" : (metrics?.received ?? 0)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.complained}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">
                {loadingMetrics ? "…" : (metrics?.complained ?? 0)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500" aria-hidden />
              <span className="text-neutral-600 dark:text-neutral-400">{copy.bounced}</span>{" "}
              <span className="font-medium text-neutral-900 dark:text-white">
                {loadingMetrics ? "…" : (metrics?.bounced ?? 0)}
              </span>
            </span>
          </div>
          <div className="flex h-44 items-end justify-center gap-4 border-t border-neutral-200 pt-4 dark:border-hub-border sm:gap-8">
            {loadingMetrics || !metrics ? (
              <p className="text-sm text-neutral-500">{metricsCopy.loading}</p>
            ) : (
              barSeries.map((b) => (
                <div key={b.key} className="flex flex-col items-center gap-2">
                  <div className="flex h-32 w-10 items-end justify-center rounded-sm bg-neutral-200/80 dark:bg-neutral-800/80">
                    <div
                      className={cn("w-full rounded-t-sm transition-all", b.color)}
                      style={{ height: `${Math.max(4, b.pct)}%` }}
                      title={`${b.label}: ${b.value}`}
                    />
                  </div>
                  <span className="max-w-[5rem] text-center text-[10px] text-neutral-500 dark:text-neutral-500">
                    {b.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.unifiedInbox}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{copy.latestThreads}</p>
              </div>
              <Link
                href="/dashboard/inboxes/unified"
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
              >
                {copy.viewAll}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            {loadingMailboxes ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-neutral-500">{inboxCopy.loading}</p>
              </div>
            ) : !firstMailbox ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="mb-3 size-10 text-neutral-300 dark:text-neutral-600" aria-hidden />
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{inboxCopy.noMailbox}</p>
                <Link
                  href="/dashboard/inboxes/new"
                  className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
                >
                  {inboxCopy.associateMailbox}
                </Link>
              </div>
            ) : loadingFolders || loadingThreads ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-neutral-500">{inboxCopy.sync}</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="mb-3 size-10 text-neutral-300 dark:text-neutral-600" aria-hidden />
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{copy.noMessages}</p>
                <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-500">
                  {copy.noMessagesDescription}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <OverviewThreadRow
                      thread={thread}
                      mailboxId={firstMailbox.id}
                      locale={locale}
                      noSenderLabel={inboxCopy.noSender}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.resources}</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {copy.domains}{" "}
                    <span className="text-neutral-500 dark:text-neutral-400">
                      ({domainUsed}/{domainLimit})
                    </span>
                  </span>
                  <Link
                    href="/dashboard/upgrade"
                    className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                  >
                    {copy.upgrade}
                  </Link>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-neutral-700 dark:text-neutral-300">
                    <span>{copy.inboxes}</span>
                    <span>
                      {mailUsed} / {mailLimit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-neutral-900 dark:bg-white"
                      style={{ width: `${inboxProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-neutral-200 p-3 dark:border-hub-border">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {loadingMetrics ? "…" : `${bouncePct}%`}
                  </p>
                  <p className="text-[10px] font-medium uppercase text-neutral-500">{copy.bounceRate}</p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3 dark:border-hub-border">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {loadingMetrics ? "…" : `${complaintPct}%`}
                  </p>
                  <p className="text-[10px] font-medium uppercase text-neutral-500">{copy.complainedRate}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-1 text-[10px] font-medium uppercase text-neutral-500">{metricsCopy.deliveryRate}</p>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className={cn("h-full rounded-full transition-all", deliveryTone)}
                    style={{ width: `${Math.min(100, metrics?.deliveryPct ?? 0)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {loadingMetrics ? "…" : `${metrics?.deliveryPct ?? 0}% · ${metricsCopy.score}: ${metrics?.score ?? 0}`}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function OverviewThreadRow({
  thread,
  mailboxId,
  locale,
  noSenderLabel,
}: {
  thread: ThreadSummary;
  mailboxId: string;
  locale: AppLocale;
  noSenderLabel: string;
}) {
  return (
    <Link
      href={`/dashboard/inboxes/${encodeURIComponent(mailboxId)}/inbox?threadId=${encodeURIComponent(thread.id)}`}
      className={cn(
        "flex items-start gap-3 px-1 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5",
        thread.unread && "bg-neutral-50/70 font-medium dark:bg-white/[0.03]",
      )}
    >
      <Star
        className={cn("mt-0.5 size-4 shrink-0", thread.starred ? "fill-yellow-400 text-yellow-500" : "text-neutral-400")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-neutral-900 dark:text-neutral-100">
          {thread.from.name || thread.from.email || noSenderLabel}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{thread.from.email}</p>
        <p className="mt-0.5 truncate text-neutral-700 dark:text-neutral-300">{thread.subject}</p>
        {thread.preview ? (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{thread.preview}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {formatRelative(thread.receivedAt, locale)}
      </span>
    </Link>
  );
}
