"use client";

import { useState } from "react";
import { Play, Plus, Power, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  useAgentBudget,
  useAgents,
  useCreateAgent,
  useDeleteAgent,
  useRunAgent,
  useSetBudget,
  useUpdateAgent,
} from "@/hooks/use-agents";

const DEFAULT_MODEL = "openai/gpt-4.1-mini";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const { data: budget } = useAgentBudget();
  const create = useCreateAgent();
  const update = useUpdateAgent();
  const remove = useDeleteAgent();
  const run = useRunAgent();
  const setBudget = useSetBudget();

  const [name, setName] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(
    "És um agente de suporte. Classifica o email por prioridade e rascunha uma resposta.",
  );
  const [monthlyCents, setMonthlyCents] = useState(budget?.monthlyCents ?? 0);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Nome obrigatório");
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        model: model.trim(),
        systemPrompt: systemPrompt.trim(),
        enabled: false,
      });
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar agent");
    }
  }

  const usedPct = budget?.monthlyCents
    ? Math.min(100, Math.round(((budget.usedCents ?? 0) / budget.monthlyCents) * 100))
    : 0;

  return (
    <DashboardShell
      title="Agents"
      subtitle="Automação com IA — preparado para runtime AI SDK."
    >
      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Orçamento mensal
            </h2>
            <p className="text-xs text-neutral-500">
              0 = ilimitado. Limita o custo estimado das execuções dos agentes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={100}
              value={monthlyCents}
              onChange={(e) => setMonthlyCents(Number(e.target.value))}
              className="w-32 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
            />
            <span className="text-xs text-neutral-500">cents</span>
            <button
              type="button"
              onClick={() => setBudget.mutate({ monthlyCents })}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-neutral-900"
            >
              Guardar
            </button>
          </div>
        </div>
        {budget ? (
          <div className="mt-3">
            <p className="text-xs text-neutral-500">
              {formatCents(budget.usedCents)} usados de {formatCents(budget.monthlyCents)} ({usedPct}%)
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full ${usedPct > 90 ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Novo agente
        </h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Modelo (ex: openai/gpt-4.1-mini)"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          />
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="System prompt"
            rows={3}
            className="min-h-[96px] rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-hub-border dark:bg-hub-card"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start dark:bg-white dark:text-neutral-900"
          >
            <Plus className="size-4" /> Criar agente
          </button>
        </form>
        {error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="flex border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400">
          <span className="flex-1">Agent</span>
          <span className="w-48">Modelo</span>
          <span className="w-28">Estado</span>
          <span className="w-40 text-right">Acções</span>
        </header>
        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">A carregar…</p>
        ) : agents && agents.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {agents.map((agent) => (
              <li key={agent.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {agent.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {agent.systemPrompt}
                  </p>
                </div>
                <span className="w-48 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  {agent.model}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update.mutate({
                      id: agent.id,
                      patch: { enabled: !agent.enabled },
                    })
                  }
                  className={`flex w-28 items-center justify-center gap-1 rounded border px-2 py-1 text-xs ${
                    agent.enabled
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-neutral-300 text-neutral-500"
                  }`}
                >
                  <Power className="size-3" />
                  {agent.enabled ? "ativo" : "pausado"}
                </button>
                <div className="flex w-40 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => run.mutate({ id: agent.id, dryRun: true })}
                    disabled={run.isPending}
                    className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
                  >
                    <Play className="size-3" /> Dry-run
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(agent.id)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Delete agent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            Sem agentes ainda. O runtime AI SDK pode ser ligado sem alterações de schema.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}
