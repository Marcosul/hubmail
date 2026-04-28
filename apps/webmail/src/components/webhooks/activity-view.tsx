"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/client";
import { useWebhookActivity } from "@/hooks/use-webhooks";

function formatHourRange(since: string, hours: number) {
  const start = new Date(since);
  const end = new Date(start.getTime() + hours * 3600_000);
  const fmt = (d: Date) => `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

interface ActivityChartProps {
  attempts: { status: string; createdAt: string }[];
  windowHours: number;
  since: string;
}

function ActivityChart({ attempts, windowHours, since }: ActivityChartProps) {
  // Bucket por hora; cada bucket conta tentativas.
  const start = new Date(since).getTime();
  const buckets = useMemo(() => {
    const arr = new Array(windowHours).fill(0);
    for (const a of attempts) {
      const idx = Math.floor((new Date(a.createdAt).getTime() - start) / 3600_000);
      if (idx >= 0 && idx < windowHours) arr[idx] += 1;
    }
    return arr as number[];
  }, [attempts, windowHours, start]);

  const max = Math.max(1, ...buckets);
  const w = 800;
  const h = 200;
  const stepX = w / Math.max(buckets.length - 1, 1);
  const points = buckets
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * (h - 20) - 10).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-neutral-300 dark:text-neutral-700">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
      {buckets.map((v, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={h - (v / max) * (h - 20) - 10}
          r="3"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export function ActivityView() {
  const { messages } = useI18n();
  const copy = messages.webhooks.activity;
  const { data, isLoading } = useWebhookActivity(6);

  if (isLoading || !data) {
    return <p className="text-sm text-neutral-500">{messages.common.loading}</p>;
  }

  const range = formatHourRange(data.since, data.windowHours);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <p className="text-sm text-neutral-500">
          {copy.windowLast.replace("{hours}", String(data.windowHours))} ({range})
        </p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase text-neutral-500">{copy.successful}</p>
          <p className="text-3xl font-semibold">{data.succeeded}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-neutral-500">{copy.failed}</p>
          <p className="text-3xl font-semibold">{data.failed}</p>
        </div>
      </div>

      <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="border-b border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-hub-border">
          {copy.recentActivity}
        </header>
        <div className="relative p-4">
          <ActivityChart
            attempts={data.attempts}
            windowHours={data.windowHours}
            since={data.since}
          />
          {data.total === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-neutral-500">
              {copy.noAttempts.replace("{hours}", String(data.windowHours))}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
