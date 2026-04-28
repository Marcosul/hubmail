"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import type { WebhookEventType } from "@hubmail/types";
import { WEBHOOK_EVENT_PUBLIC_NAME } from "@hubmail/types";
import { useUpdateWebhook, useWebhookCatalog } from "@/hooks/use-webhooks";
import { EventCheckboxTree } from "./event-checkbox-tree";

export function SubscribedEventsCard({
  webhookId,
  events,
}: {
  webhookId: string;
  events: WebhookEventType[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WebhookEventType[]>(events);
  const update = useUpdateWebhook();
  const { data: catalog } = useWebhookCatalog();

  const onSave = async () => {
    await update.mutateAsync({ id: webhookId, patch: { events: draft } });
    setEditing(false);
  };

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Subscribed events
        </h3>
        {editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(events);
              setEditing(false);
            }}
            className="flex items-center gap-1 rounded border border-neutral-200 px-2 py-0.5 text-xs dark:border-hub-border"
          >
            <X className="size-3" />
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded border border-neutral-200 px-2 py-0.5 text-xs dark:border-hub-border"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-2">
          <EventCheckboxTree
            catalog={catalog ?? []}
            selected={draft}
            onChange={setDraft}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={update.isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {update.isPending ? "…" : "Save"}
          </button>
        </div>
      ) : (
        <ul className="space-y-1 text-xs">
          {events.length === 0 ? (
            <li className="text-neutral-500">Receiving all events</li>
          ) : (
            events.map((e) => (
              <li key={e} className="font-mono text-neutral-700 dark:text-neutral-300">
                {WEBHOOK_EVENT_PUBLIC_NAME[e]}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
