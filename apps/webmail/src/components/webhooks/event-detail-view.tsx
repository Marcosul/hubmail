"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { useWebhookEvent } from "@/hooks/use-webhooks";
import { WEBHOOK_EVENT_PUBLIC_NAME } from "@hubmail/types";
import { WebhookAttemptsTable } from "./webhook-attempts-table";

export function EventDetailView({ id }: { id: string }) {
  const { messages, locale } = useI18n();
  const copy = messages.webhooks.logs;
  const { data, isLoading } = useWebhookEvent(id);
  const [raw, setRaw] = useState(false);

  if (isLoading || !data) {
    return <p className="text-sm text-neutral-500">{messages.common.loading}</p>;
  }

  const fullPayload = {
    ...data.payload,
    event_id: data.id,
    event_type: WEBHOOK_EVENT_PUBLIC_NAME[data.eventType],
    type: "event",
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        <Link href="/webhooks/logs" className="hover:underline">
          {copy.backToLogs}
        </Link>{" "}
        / <span className="font-mono text-xs">{data.id}</span>
      </p>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{WEBHOOK_EVENT_PUBLIC_NAME[data.eventType]}</h2>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">{copy.createdAt}</p>
          <p>{new Date(data.createdAt).toLocaleString(locale)}</p>
        </div>
      </div>

      <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-sm dark:border-hub-border">
          <span className="font-semibold">{copy.messageContent}</span>
          <label className="flex items-center gap-2 text-xs">
            {copy.raw}
            <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} />
          </label>
        </header>
        <pre className="overflow-auto p-4 text-xs">
          {raw ? JSON.stringify(fullPayload) : JSON.stringify(fullPayload, null, 2)}
        </pre>
      </section>

      <WebhookAttemptsTable attempts={data.attempts} />
    </div>
  );
}
