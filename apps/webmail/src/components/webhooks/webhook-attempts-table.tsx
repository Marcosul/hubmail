"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import type { WebhookAttempt } from "@hubmail/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "succeeded" | "failed";

export function WebhookAttemptsTable({ attempts }: { attempts: WebhookAttempt[] }) {
  const { messages, locale } = useI18n();
  const copy = messages.webhooks.logs;
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = attempts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "succeeded") return a.status === "SUCCEEDED";
    return a.status === "FAILED";
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {copy.webhookAttempts}
        </h3>
        <div className="flex gap-1 rounded-md border border-neutral-200 p-0.5 text-xs dark:border-hub-border">
          {(["all", "succeeded", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-2 py-1",
                filter === f && "bg-neutral-100 dark:bg-white/10",
              )}
            >
              {copy[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">{copy.noAttempts}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414]">
              <tr>
                <th className="px-4 py-2">{copy.status}</th>
                <th className="px-4 py-2">{copy.url}</th>
                <th className="px-4 py-2">{copy.attempt}</th>
                <th className="px-4 py-2">{copy.durationMs}</th>
                <th className="px-4 py-2 text-right">{copy.timestamp}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-hub-border">
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        a.status === "SUCCEEDED"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : a.status === "FAILED"
                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300",
                      )}
                    >
                      {a.statusCode ?? a.status}
                    </span>
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-2 font-mono text-xs">{a.url}</td>
                  <td className="px-4 py-2 text-xs">#{a.attempt}</td>
                  <td className="px-4 py-2 text-xs">{a.durationMs ?? "—"} ms</td>
                  <td className="px-4 py-2 text-right text-xs text-neutral-500">
                    {new Date(a.createdAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
