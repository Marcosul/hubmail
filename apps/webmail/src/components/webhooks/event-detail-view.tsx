"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { useWebhookEvent } from "@/hooks/use-webhooks";
import { WEBHOOK_EVENT_PUBLIC_NAME } from "@hubmail/types";
import { WebhookAttemptsTable } from "./webhook-attempts-table";
import { JsonBlock } from "./json-block";

export function EventDetailView({ id }: { id: string }) {
  const { messages, locale } = useI18n();
  const copy = messages.webhooks.logs;
  const { data, isLoading } = useWebhookEvent(id);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <WebhookAttemptsTable attempts={data.attempts} />
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {copy.messageContent}
          </h3>
          <JsonBlock
            title={copy.messageContent}
            value={fullPayload}
            maxHeightClass="max-h-[700px]"
          />
        </div>
      </div>
    </div>
  );
}
