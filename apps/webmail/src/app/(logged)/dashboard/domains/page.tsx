"use client";

import { useState } from "react";
import { Globe, Plus, RefreshCw, Trash2, CheckCircle, Clock, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DomainSetupWizard } from "@/components/domains/domain-setup-wizard";
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
  const common = messages.common;

  const { data: domains, isLoading } = useDomains();
  const { data: planInfo } = useDomainPlanInfo();
  const create = useCreateDomain();
  const verify = useVerifyDomain();
  const remove = useDeleteDomain();

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const [wizard, setWizard] = useState<{
    open: boolean;
    mode: "create" | "configure";
    id: string | null;
    name: string | null;
  }>({ open: false, mode: "create", id: null, name: null });

  const atLimit = planInfo ? planInfo.used >= planInfo.limit : false;
  const isFreePlan = planInfo?.limit === 1;

  const filteredDomains = domains?.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredDomains.length / pageSize);
  const paginatedDomains = filteredDomains.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const isValidDomain = (val: string) => {
    return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i.test(val);
  };

  const domainExists = domains?.some(
    (d) => d.name.toLowerCase() === searchQuery.toLowerCase()
  );
  const canAdd =
    isValidDomain(searchQuery) && !domainExists && !atLimit && !create.isPending;

  async function handleAdd() {
    if (!canAdd) return;
    setError(null);
    try {
      await create.mutateAsync({ name: searchQuery.trim().toLowerCase() });
      setSearchQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar domínio");
    }
  }

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      {isFreePlan && atLimit ? (
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-3 sm:flex-row sm:items-center dark:bg-amber-950/30">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {copy.premium}
            </span>{" "}
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

      <section className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <div className="border-b border-neutral-200 bg-white p-3 dark:border-hub-border dark:bg-hub-card">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {planInfo && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {planInfo.used} / {planInfo.limit}
                  </span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
                      style={{
                        width: `${Math.min(100, (planInfo.used / planInfo.limit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder="Procurar ou adicionar novo domínio..."
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-hub-border dark:bg-[#141414] dark:text-white dark:focus:border-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800 disabled:opacity-30 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <Plus className="size-4" />
                {create.isPending ? "…" : "Adicionar"}
              </button>
            </div>
            {atLimit && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Limite atingido.{" "}
                <Link
                  href="/dashboard/upgrade"
                  className="font-semibold underline"
                >
                  Faça upgrade
                </Link>{" "}
                para adicionar mais domínios.
              </p>
            )}
            {error && (
              <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        </div>

        <header className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400 md:grid md:grid-cols-[1fr_140px_160px_minmax(200px,auto)]">
          <span>Domínio</span>
          <span>Mailboxes</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </header>

        <div className="h-[calc(100vh-320px)] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <p className="px-4 py-12 text-center text-sm text-neutral-500">
              {messages.common.loading}
            </p>
          ) : !domains || domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Globe
                className="mb-4 size-12 text-neutral-300 dark:text-neutral-600"
                aria-hidden
              />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {copy.emptyTitle}
              </h2>
              <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                {copy.emptyDescription}
              </p>
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Search
                className="mb-3 size-8 text-neutral-300 dark:text-neutral-600"
                aria-hidden
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum domínio encontrado para &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
              {paginatedDomains.map((domain) => (
                <li
                  key={domain.id}
                  className="grid grid-cols-1 gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_140px_160px_minmax(200px,auto)] md:items-center"
                >
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {domain.name}
                    </p>
                    {domain.dnsCheckedAt && (
                      <p className="text-xs text-neutral-500">
                        Verificado em{" "}
                        {new Date(domain.dnsCheckedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">
                    {domain.mailboxCount} mailbox
                    {domain.mailboxCount !== 1 ? "es" : ""}
                  </span>
                  <StatusBadge status={domain.status} />
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWizard({
                          open: true,
                          mode: "configure",
                          id: domain.id,
                          name: domain.name,
                        })
                      }
                      className="rounded px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      {copy.wizard.configureCta}
                    </button>
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
                      title={
                        domain.mailboxCount > 0
                          ? "Remova as mailboxes primeiro"
                          : "Excluir domínio"
                      }
                      className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <footer className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-hub-border dark:bg-[#141414]">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {common.page} <span className="font-medium">{currentPage}</span> {common.of}{" "}
              <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
              >
                <ChevronLeft className="size-3.5" />
                {common.previous}
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {common.next}
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {wizard.open ? (
        <DomainSetupWizard
          open
          onOpenChange={(open) => setWizard((w) => ({ ...w, open }))}
          mode={wizard.mode}
          existingDomainId={wizard.mode === "configure" ? wizard.id : null}
          existingDomainName={wizard.mode === "configure" ? wizard.name : null}
          copy={copy.wizard}
        />
      ) : null}
    </DashboardShell>
  );
}
