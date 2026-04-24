"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/rest/generic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { MetricsSnapshot } from "@hubmail/types";

const WINDOWS = [
  { value: 24, label: "Últimas 24 horas" },
  { value: 24 * 7, label: "Últimos 7 dias" },
  { value: 24 * 30, label: "Últimos 30 dias" },
];

export default function MetricsPage() {
  const [hours, setHours] = useState(24);
  const { data, isLoading } = useQuery<MetricsSnapshot>({
    queryKey: ["metrics", hours],
    queryFn: () =>
      apiRequest<MetricsSnapshot>(`/api/metrics/workspace?hours=${hours}`),
    refetchInterval: 60_000,
  });

  const score = data?.score ?? 0;
  const scoreLabel =
    score >= 95 ? "Excelente" : score >= 80 ? "Bom" : score >= 50 ? "A melhorar" : "Crítico";
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
      title="Metrics"
      subtitle={data ? `Janela: ${data.windowHours}h · gerado ${new Date(data.generatedAt).toLocaleTimeString()}` : "…"}
      actions={
        <div className="flex flex-wrap gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
          >
            {WINDOWS.map((w) => (
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
          Score: {score} — {scoreLabel}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${scoreTone}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        {isLoading ? (
          "A carregar métricas…"
        ) : (
          <>
            <Kpi value={data?.sent ?? 0} label="enviados" /> ·{" "}
            <Kpi value={data?.delivered ?? 0} label="entregues" /> ·{" "}
            <Kpi value={`${data?.deliveryPct ?? 0}%`} label="taxa de entrega" /> ·{" "}
            <Kpi value={data?.received ?? 0} label="recebidos" /> ·{" "}
            <Kpi value={data?.bounced ?? 0} label="bounces" /> ·{" "}
            <Kpi value={data?.complained ?? 0} label="spam reports" /> ·{" "}
            <Kpi value={data?.rejected ?? 0} label="rejeitados" />
          </>
        )}
      </p>

      <div className="rounded-lg border border-neutral-200 p-6 dark:border-hub-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Volume de email
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Dados agregados do workspace — actualização a cada 60s.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label="Sent" value={data?.sent ?? 0} tone="text-blue-600" />
          <Card label="Received" value={data?.received ?? 0} tone="text-emerald-600" />
          <Card label="Bounced" value={data?.bounced ?? 0} tone="text-red-600" />
          <Card label="Spam" value={data?.complained ?? 0} tone="text-amber-600" />
        </div>
      </div>
    </DashboardShell>
  );
}

function Kpi({ value, label }: { value: number | string; label: string }) {
  return (
    <span>
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
