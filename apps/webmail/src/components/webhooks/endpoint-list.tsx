"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import {
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhookEndpoints,
} from "@/hooks/use-webhooks";

export function EndpointList() {
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  const { data, isLoading } = useWebhookEndpoints();
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {copy.list}
        </h2>
        <Link
          href="/webhooks/endpoints/new"
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          <Plus className="size-4" />
          {copy.newEndpoint}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            {messages.common.loading}
          </p>
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {data.map((w) => (
              <li
                key={w.id}
                className="flex flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/webhooks/endpoints/${w.id}`}
                    className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    {w.url}
                  </Link>
                  {w.description ? (
                    <p className="truncate text-xs text-neutral-500">{w.description}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {w.events.length === 0
                      ? copy.receivingAll
                      : `${w.events.length} eventos`}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) =>
                      update.mutate({ id: w.id, patch: { enabled: e.target.checked } })
                    }
                  />
                  {w.enabled ? messages.common.active : messages.common.paused}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(copy.confirmDelete)) remove.mutate(w.id);
                  }}
                  className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label={copy.delete}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">{copy.empty}</p>
        )}
      </div>
    </section>
  );
}
