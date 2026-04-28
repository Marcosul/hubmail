"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useWebhookEvents } from "@/hooks/use-webhooks";
import { WEBHOOK_EVENT_PUBLIC_NAME } from "@hubmail/types";

export function LogsTable() {
  const { messages, locale } = useI18n();
  const copy = messages.webhooks.logs;
  const { data, isLoading, refetch, isFetching } = useWebhookEvents({ limit: 50 });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {copy.title}
        </h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-hub-border"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {messages.common.refresh}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2">{copy.eventType}</th>
              <th className="px-4 py-2">{copy.messageId}</th>
              <th className="px-4 py-2 text-right">{copy.timestamp}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-hub-border">
            {isLoading ? (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={3}>
                  {messages.common.loading}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      href={`/webhooks/logs/${e.id}`}
                      className="text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      {WEBHOOK_EVENT_PUBLIC_NAME[e.eventType]}
                    </Link>
                  </td>
                  <td className="px-4 py-2 truncate font-mono text-xs text-neutral-500">
                    {e.messageId ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-neutral-500">
                    {new Date(e.createdAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={3}>
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.length > 0 ? (
        <p className="text-xs text-neutral-500">
          {copy.showing.replace("{n}", String(data.length))}
        </p>
      ) : null}
    </section>
  );
}
