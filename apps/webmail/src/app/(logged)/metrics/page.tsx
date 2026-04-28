"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { MetricsSnapshot } from "@hubmail/types";

export default function MetricsPage() {
  const { locale, messages } = useI18n();
  const copy = messages.metrics;
  const windows = [
    { value: 24, label: copy.windows.last24h },
    { value: 24 * 7, label: copy.windows.last7d },
    { value: 24 * 30, label: copy.windows.last30d },
  ];
  const [hours, setHours] = useState(24);
  const { data, isLoading } = useQuery<MetricsSnapshot>({
    queryKey: ["metrics", hours],
    queryFn: () =>
      apiRequest<MetricsSnapshot>(`/api/metrics/workspace?hours=${hours}`),
    refetchInterval: 60_000,
  });

  const score = data?.score ?? 0;
  const scoreLabel =
    score >= 95
      ? copy.scoreLabels.excellent
      : score >= 80
        ? copy.scoreLabels.good
        : score >= 50
          ? copy.scoreLabels.improving
          : copy.scoreLabels.critical;
  const scoreTone =
    score >= 95
      ? "bg-emerald-500"
      : score >= 80
        ? "bg-lime-500"
        : score >= 50
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <DashboardShell
      title={copy.title}
      subtitle={
        data
          ? `${copy.window}: ${data.windowHours}h · ${copy.generated} ${new Date(data.generatedAt).toLocaleTimeString(getLocaleDateFormat(locale))}`
          : "…"
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
          >
            {windows.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {copy.score}: {score} — {scoreLabel}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${scoreTone}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="mb-8 flex flex-wrap gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
        {isLoading ? (
          copy.loading
        ) : (
          <>
            <Kpi value={data?.sent ?? 0} label={copy.sent} />
            <Kpi value={data?.delivered ?? 0} label={copy.delivered} />
            <Kpi value={`${data?.deliveryPct ?? 0}%`} label={copy.deliveryRate} />
            <Kpi value={data?.received ?? 0} label={copy.received} />
            <Kpi value={data?.bounced ?? 0} label={copy.bounced} />
            <Kpi value={data?.complained ?? 0} label={copy.spamReports} />
            <Kpi value={data?.rejected ?? 0} label={copy.rejected} />
          </>
        )}
      </p>

      <div className="rounded-lg border border-neutral-200 p-6 dark:border-hub-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {copy.emailVolume}
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {copy.emailVolumeDescription}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label={copy.cards.sent} value={data?.sent ?? 0} tone="text-blue-600" />
          <Card label={copy.cards.received} value={data?.received ?? 0} tone="text-emerald-600" />
          <Card label={copy.cards.bounced} value={data?.bounced ?? 0} tone="text-red-600" />
          <Card label={copy.cards.spam} value={data?.complained ?? 0} tone="text-amber-600" />
        </div>
      </div>
    </DashboardShell>
  );
}

function Kpi({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="after:ml-2 after:text-neutral-300 after:content-['·'] last:after:content-none dark:after:text-neutral-700">
      <span className="font-medium text-neutral-900 dark:text-white">{value}</span> {label}
    </span>
  );
}

function Card({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 text-center dark:border-hub-border">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  );
}
