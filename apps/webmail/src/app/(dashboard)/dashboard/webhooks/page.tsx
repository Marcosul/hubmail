"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useUpdateAutomation,
} from "@/hooks/use-automations";
import type { AutomationTrigger } from "@hubmail/types";

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  MAIL_RECEIVED: "Email recebido",
  MAIL_SENT: "Email enviado",
  MAIL_BOUNCED: "Email devolvido",
};

export default function WebhooksPage() {
  const { data: automations, isLoading } = useAutomations();
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const remove = useDeleteAutomation();

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTrigger, setNewTrigger] = useState<AutomationTrigger>("MAIL_RECEIVED");
  const [newSecret, setNewSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim() || !newUrl.trim()) {
      setError("Nome e URL são obrigatórios");
      return;
    }
    try {
      await create.mutateAsync({
        name: newName.trim(),
        trigger: newTrigger,
        actions: [
          {
            type: "forward-webhook",
            url: newUrl.trim(),
            ...(newSecret ? { secret: newSecret } : {}),
          },
        ],
        enabled: true,
      });
      setNewName("");
      setNewUrl("");
      setNewSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar webhook");
    }
  }

  return (
    <DashboardShell
      title="Webhooks & Automations"
      subtitle="Encaminhe eventos de email para outros serviços."
    >
      <section className="mb-8 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Novo endpoint
        </h2>
        <form
          onSubmit={handleCreate}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome (e.g. CRM principal)"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://meu-crm.com/webhook"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
            type="url"
          />
          <select
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value as AutomationTrigger)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          >
            {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            <Plus className="size-4" />
            {create.isPending ? "…" : "Adicionar"}
          </button>
          <input
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            placeholder="Secret HMAC (opcional — assina como sha256=…)"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-4 dark:border-hub-border dark:bg-hub-card"
          />
        </form>
        {error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="flex border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400">
          <span className="flex-1">Automation</span>
          <span className="w-40">Trigger</span>
          <span className="w-28">Estado</span>
          <span className="w-12" aria-label="actions" />
        </header>
        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            A carregar…
          </p>
        ) : automations && automations.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {automations.map((auto) => {
              const action = auto.actions?.[0] as unknown as
                | Record<string, unknown>
                | undefined;
              const url = typeof action?.url === "string" ? action.url : "—";
              return (
                <li
                  key={auto.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {auto.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{url}</p>
                  </div>
                  <span className="w-40 text-xs text-neutral-600 dark:text-neutral-300">
                    {TRIGGER_LABELS[auto.trigger]}
                  </span>
                  <label className="flex w-28 items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={auto.enabled}
                      onChange={(e) =>
                        update.mutate({
                          id: auto.id,
                          patch: { enabled: e.target.checked },
                        })
                      }
                    />
                    {auto.enabled ? "ativa" : "pausada"}
                  </label>
                  <button
                    type="button"
                    onClick={() => remove.mutate(auto.id)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Delete automation"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            Sem automações ainda. Crie a primeira acima.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}
