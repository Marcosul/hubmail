"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WebhookEventType } from "@hubmail/types";
import { useI18n } from "@/i18n/client";
import {
  useCreateWebhook,
  useUpdateWebhook,
  useWebhookCatalog,
} from "@/hooks/use-webhooks";
import { EventCheckboxTree } from "./event-checkbox-tree";
import { ScopeSelector } from "./scope-selector";

interface Props {
  initial?: {
    id: string;
    url: string;
    description: string | null;
    events: WebhookEventType[];
    workspaceIds: string[];
    inboxIds: string[];
    clientId: string | null;
    enabled: boolean;
  };
}

export function EndpointForm({ initial }: Props) {
  const router = useRouter();
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  const { data: catalog } = useWebhookCatalog();
  const create = useCreateWebhook();
  const update = useUpdateWebhook();

  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [events, setEvents] = useState<WebhookEventType[]>(initial?.events ?? []);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>(initial?.workspaceIds ?? []);
  const [inboxIds, setInboxIds] = useState<string[]>(initial?.inboxIds ?? []);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial);
  const submitting = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      new URL(url);
    } catch {
      setError(copy.urlInvalid);
      return;
    }

    const payload = {
      url,
      description: description || undefined,
      events,
      workspaceIds,
      inboxIds,
      clientId: clientId || undefined,
      enabled,
    };

    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, patch: payload });
        router.push("/webhooks/endpoints");
      } else {
        const res = await create.mutateAsync(payload);
        router.push(`/webhooks/endpoints/${res.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.createError);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {copy.urlLabel}
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={copy.urlPlaceholder}
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          type="url"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {copy.descriptionLabel}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={copy.descriptionPlaceholder}
          rows={3}
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {copy.subscribeEvents}
        </label>
        <EventCheckboxTree
          catalog={catalog ?? []}
          selected={events}
          onChange={setEvents}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Workspaces &amp; Inboxes
        </label>
        <p className="mb-2 text-xs text-neutral-500">
          Selecione workspaces da organização e/ou inboxes específicas para filtrar a entrega. Vazio = workspace owner.
        </p>
        <ScopeSelector
          workspaceIds={workspaceIds}
          inboxIds={inboxIds}
          onChange={({ workspaceIds: w, inboxIds: i }) => {
            setWorkspaceIds(w);
            setInboxIds(i);
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Client ID (opcional)
        </label>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="ex.: meu-app-prod"
          maxLength={128}
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
        />
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {messages.common.active}
        </label>
      )}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? "…" : isEdit ? copy.save : copy.create}
        </button>
        <button
          type="button"
          onClick={() => router.push("/webhooks/endpoints")}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border"
        >
          {copy.cancel}
        </button>
      </div>
    </form>
  );
}
