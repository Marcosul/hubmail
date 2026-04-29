"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { WebhookEventType } from "@hubmail/types";
import { useTestWebhook, useWebhookCatalog } from "@/hooks/use-webhooks";
import { getWebhookSample } from "@/lib/webhook-samples";
import { getWebhookSchema } from "@/lib/webhook-schemas";
import { JsonBlock } from "./json-block";
import { SchemaTree } from "./schema-tree";

export function EndpointTestingTab({ webhookId }: { webhookId: string }) {
  const { data: catalog } = useWebhookCatalog();
  const test = useTestWebhook();
  const [eventType, setEventType] = useState<WebhookEventType>("MESSAGE_RECEIVED");
  const [result, setResult] = useState<string | null>(null);

  const selectedItem = catalog?.find((c) => c.type === eventType);
  const eventName = selectedItem?.name ?? "";
  const example = getWebhookSample(eventName);
  const schema = getWebhookSchema(eventName);

  const onSend = async () => {
    setResult(null);
    try {
      const r = await test.mutateAsync({ id: webhookId, eventType });
      setResult(`Disparado — eventId ${r.eventId}`);
    } catch (e) {
      setResult(`Erro: ${e instanceof Error ? e.message : "unknown"}`);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="border-b border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-hub-border">
          Example Webhook
        </header>
        <div className="space-y-3 p-4 text-sm">
          <p>
            To test your integration, ping this endpoint with an example event. For more
            information about each event type, take a look at the Event Catalog.
          </p>
          <p className="text-xs text-neutral-500">
            <strong>Note:</strong> Failed messages sent this way will not be retried.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Send event</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as WebhookEventType)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
            >
              {(catalog ?? []).map((c) => (
                <option key={c.type} value={c.type}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-neutral-500">Schema</h4>
              <SchemaTree fields={schema} />
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                Example {eventName}
              </h4>
              <JsonBlock title={`Example ${eventName}`} value={example} />
            </div>
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={test.isPending}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            <Send className="size-4" />
            {test.isPending ? "Sending…" : "Send test event"}
          </button>
          {result ? (
            <p className="text-xs text-neutral-600 dark:text-neutral-300">{result}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
