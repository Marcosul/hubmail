"use client";

import { useState } from "react";
import { Globe, Plus, RefreshCw, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useI18n } from "@/i18n/client";
import {
  useDomains,
  useDomainPlanInfo,
  useCreateDomain,
  useVerifyDomain,
  useDeleteDomain,
  type Domain,
} from "@/hooks/use-domains";

function StatusBadge({ status }: { status: Domain["status"] }) {
  if (status === "VERIFIED") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle className="size-3" />
        Verificado
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        <XCircle className="size-3" />
        Falhou
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Clock className="size-3" />
      Pendente
    </span>
  );
}

export default function DomainsPage() {
  const { messages } = useI18n();
  const copy = messages.domains;

  const { data: domains, isLoading } = useDomains();
  const { data: planInfo } = useDomainPlanInfo();
  const create = useCreateDomain();
  const verify = useVerifyDomain();
  const remove = useDeleteDomain();

  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const atLimit = planInfo ? planInfo.used >= planInfo.limit : false;
  const isFreePlan = planInfo?.limit === 1;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newDomain.trim().toLowerCase();
    if (!name) { setError("Digite um domínio"); return; }
    try {
      await create.mutateAsync(name);
      setNewDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar domínio");
    }
  }

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
    >
      {isFreePlan && atLimit ? (
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-3 sm:flex-row sm:items-center dark:bg-amber-950/30">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{copy.premium}</span>{" "}
            {copy.premiumDescription}
          </p>
          <Link
            href="/dashboard/upgrade"
            className="shrink-0 rounded-md border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 hover:bg-amber-500/10 dark:text-amber-200"
          >
            {copy.upgradePlan}
          </Link>
        </div>
      ) : null}

      {planInfo && (
        <div className="mb-6 flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            {planInfo.used} / {planInfo.limit} domínio{planInfo.limit !== 1 ? "s" : ""}
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
              style={{ width: `${Math.min(100, (planInfo.used / planInfo.limit) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!atLimit && (
        <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-hub-border">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Adicionar domínio
          </h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: meudominio.com"
              className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            />
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              <Plus className="size-4" />
              {create.isPending ? "…" : "Adicionar"}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400 md:grid md:grid-cols-[1fr_140px_160px_auto]">
          <span>Domínio</span>
          <span>Mailboxes</span>
          <span>Status</span>
          <span />
        </header>

        {isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">{messages.common.loading}</p>
        ) : !domains || domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Globe className="mb-4 size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
              {copy.emptyDescription}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {domains.map((domain) => (
              <li
                key={domain.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_140px_160px_auto] md:items-center"
              >
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{domain.name}</p>
                  {domain.dnsCheckedAt && (
                    <p className="text-xs text-neutral-500">
                      Verificado em {new Date(domain.dnsCheckedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-neutral-600 dark:text-neutral-300">
                  {domain.mailboxCount} mailbox{domain.mailboxCount !== 1 ? "es" : ""}
                </span>
                <StatusBadge status={domain.status} />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => verify.mutate(domain.id)}
                    disabled={verify.isPending}
                    title="Verificar DNS"
                    className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-neutral-300"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(domain.id)}
                    disabled={remove.isPending || domain.mailboxCount > 0}
                    title={domain.mailboxCount > 0 ? "Remova as mailboxes primeiro" : "Excluir domínio"}
                    className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
