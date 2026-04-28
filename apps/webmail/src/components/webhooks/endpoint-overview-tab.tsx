"use client";

import { useEffect, useState } from "react";
import type { Webhook } from "@hubmail/types";
import { useUpdateWebhook } from "@/hooks/use-webhooks";
import { ScopeSelector } from "./scope-selector";

export function EndpointOverviewTab({ webhook }: { webhook: Webhook }) {
  const update = useUpdateWebhook();
  const [description, setDescription] = useState(webhook.description ?? "");
  const [clientId, setClientId] = useState(webhook.clientId ?? "");
  const [enabled, setEnabled] = useState(webhook.enabled);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>(webhook.workspaceIds);
  const [inboxIds, setInboxIds] = useState<string[]>(webhook.inboxIds);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const same =
      description === (webhook.description ?? "") &&
      clientId === (webhook.clientId ?? "") &&
      enabled === webhook.enabled &&
      JSON.stringify(workspaceIds) === JSON.stringify(webhook.workspaceIds) &&
      JSON.stringify(inboxIds) === JSON.stringify(webhook.inboxIds);
    setDirty(!same);
  }, [description, clientId, enabled, workspaceIds, inboxIds, webhook]);

  const handleSave = async () => {
    await update.mutateAsync({
      id: webhook.id,
      patch: {
        description: description || undefined,
        clientId: clientId || undefined,
        enabled,
        workspaceIds,
        inboxIds,
      },
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Description
        </h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional description"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
        />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Workspaces &amp; Inboxes
        </h3>
        <p className="mb-2 text-xs text-neutral-500">
          Filtros de entrega. Vazio = workspace owner.
        </p>
        <ScopeSelector
          workspaceIds={workspaceIds}
          inboxIds={inboxIds}
          onChange={({ workspaceIds: w, inboxIds: i }) => {
            setWorkspaceIds(w);
            setInboxIds(i);
          }}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Client ID</h3>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || update.isPending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
