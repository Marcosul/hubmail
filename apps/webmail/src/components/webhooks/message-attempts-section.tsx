"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useWebhookAttempts } from "@/hooks/use-webhooks";
import { WEBHOOK_EVENT_PUBLIC_NAME } from "@hubmail/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "succeeded" | "failed";

export function MessageAttemptsSection({ webhookId }: { webhookId: string }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isFetching, refetch } = useWebhookAttempts(webhookId, {
    status:
      filter === "succeeded" ? "SUCCEEDED" : filter === "failed" ? "FAILED" : undefined,
  });

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-hub-border">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-sm font-semibold"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Events
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label="Refresh"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <div className="flex gap-0.5 rounded-md border border-neutral-200 p-0.5 text-xs dark:border-hub-border">
            {(["all", "succeeded", "failed"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-2 py-0.5 capitalize",
                  filter === f && "bg-neutral-100 dark:bg-white/10",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {open && (
        <div className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414]">
              <tr>
                <th className="px-4 py-2">Event Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message ID</th>
                <th className="px-4 py-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-hub-border">
              {!data || data.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-500" colSpan={4}>
                    No attempts yet
                  </td>
                </tr>
              ) : (
                data.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/webhooks/logs/${a.eventId}`}
                        className="hover:underline"
                      >
                        {WEBHOOK_EVENT_PUBLIC_NAME[a.eventType]}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-medium",
                          a.status === "SUCCEEDED"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
                        )}
                      >
                        {a.statusCode ?? a.status}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-2 font-mono text-xs text-neutral-500">
                      {a.messageId ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-neutral-500">
                      {new Date(a.createdAt).toLocaleString(locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
