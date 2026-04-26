"use client";

import { useState } from "react";
import { KeyRound, Copy, Plus, Trash2, Check } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useI18n } from "@/i18n/client";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type CreatedApiKey } from "@/hooks/use-api-keys";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-white/5 dark:hover:text-neutral-200"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

export default function ApiKeysPage() {
  const { messages } = useI18n();
  const copy = messages.apiKeys;

  const { data: keys, isLoading } = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();

  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) { setError("Nome obrigatório"); return; }
    try {
      const created = await create.mutateAsync({ name: newName.trim() });
      setRevealed(created);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar chave");
    }
  }

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
      actions={
        <button
          type="button"
          form="create-key-form"
          disabled={create.isPending}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white sm:w-auto disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {create.isPending ? "…" : copy.create}
        </button>
      }
    >
      {revealed && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Chave criada — copie agora. Não será exibida novamente.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-hub-border dark:bg-hub-card">
            <code className="flex-1 select-all truncate font-mono text-sm text-neutral-800 dark:text-neutral-200">
              {revealed.key}
            </code>
            <CopyButton value={revealed.key} />
          </div>
          <button
            type="button"
            onClick={() => setRevealed(null)}
            className="mt-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Fechar
          </button>
        </div>
      )}

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Nova chave de API
        </h2>
        <form id="create-key-form" onSubmit={handleCreate} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ex: Integração CRM"
            className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            <Plus className="size-4" />
            {create.isPending ? "…" : "Criar"}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-neutral-500">{messages.common.loading}</p>
      ) : !keys || keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 py-16 text-center dark:border-hub-border sm:py-24">
          <KeyRound className="mb-4 size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{copy.emptyTitle}</h2>
          <p className="mt-2 max-w-md text-center text-sm text-neutral-500 dark:text-neutral-400">
            {copy.emptyDescription}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
          <header className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400 md:grid md:grid-cols-[1fr_160px_180px_auto]">
            <span>Nome</span>
            <span>Prefixo</span>
            <span>Último uso</span>
            <span />
          </header>
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {keys.map((key) => (
              <li
                key={key.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_160px_180px_auto] md:items-center"
              >
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{key.name}</p>
                  <p className="text-xs text-neutral-500">
                    Criado em {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <code className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  {key.prefix}…
                </code>
                <span className="text-xs text-neutral-500">
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleDateString()
                    : "Nunca usado"}
                </span>
                <button
                  type="button"
                  onClick={() => revoke.mutate(key.id)}
                  disabled={revoke.isPending}
                  title="Revogar chave"
                  className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
