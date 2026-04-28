"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Globe, Loader2, Plus, RefreshCw, Trash2, CheckCircle, Clock, XCircle, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { DomainSetupWizard } from "@/components/domains/domain-setup-wizard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useI18n } from "@/i18n/client";
import {
  useDomains,
  useDomainPlanInfo,
  useCreateDomain,
  useVerifyDomain,
  deleteDomainStream,
  type Domain,
  type DomainDeleteEvent,
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

  const qc = useQueryClient();
  const { data: domains, isLoading } = useDomains();
  const { data: planInfo } = useDomainPlanInfo();
  const create = useCreateDomain();
  const verify = useVerifyDomain();

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  type DeleteStepStatus = "pending" | "running" | "done" | "error" | "skipped";
  type DeleteStep = { key: string; label: string; status: DeleteStepStatus; detail?: string };
  type DeletePhase = "confirm" | "running" | "success" | "error";

  const [deleteState, setDeleteState] = useState<{
    id: string;
    name: string;
    mailboxCount: number;
    phase: DeletePhase;
    steps: DeleteStep[];
    error: string | null;
    summary: { mailboxesRemoved: number; stalwartErrors: string[] } | null;
  } | null>(null);

  const closeDeleteDialog = () => {
    if (deleteState?.phase === "running") return;
    setDeleteState(null);
  };

  const updateStep = (key: string, patch: Partial<DeleteStep>) => {
    setDeleteState((prev) => {
      if (!prev) return prev;
      const idx = prev.steps.findIndex((s) => s.key === key);
      const steps = [...prev.steps];
      if (idx >= 0) {
        steps[idx] = { ...steps[idx], ...patch };
      } else if (patch.label) {
        steps.push({
          key,
          label: patch.label,
          status: patch.status ?? "pending",
          detail: patch.detail,
        });
      }
      return { ...prev, steps };
    });
  };

  const handleDeleteEvent = (evt: DomainDeleteEvent) => {
    if (evt.step === "plan") {
      const steps: DeleteStep[] = [];
      for (let i = 0; i < evt.mailboxes; i++) {
        steps.push({ key: `mailbox-${i}`, label: "Removendo conta de email", status: "pending" });
      }
      if (evt.stalwart) {
        steps.push({ key: "dkim", label: "Removendo registros DKIM", status: "pending" });
        steps.push({ key: "domain_server", label: "Removendo domínio do servidor de email", status: "pending" });
      }
      steps.push({ key: "database", label: "Limpando emails e configurações da base de dados", status: "pending" });
      setDeleteState((prev) => (prev ? { ...prev, steps } : prev));
      return;
    }
    if (evt.step === "mailbox") {
      setDeleteState((prev) => {
        if (!prev) return prev;
        const idx = prev.steps.findIndex(
          (s) => s.key.startsWith("mailbox-") && (s.status === "pending" || (s.status === "running" && s.label.endsWith(evt.address))),
        );
        if (idx < 0) return prev;
        const steps = [...prev.steps];
        const status: DeleteStepStatus =
          evt.status === "start" ? "running" : evt.status === "skipped" ? "skipped" : evt.status;
        steps[idx] = {
          ...steps[idx],
          label: `Removendo conta ${evt.address}`,
          status,
          detail: evt.detail,
        };
        return { ...prev, steps };
      });
      return;
    }
    if (evt.step === "dkim" || evt.step === "domain_server" || evt.step === "database") {
      const status: DeleteStepStatus =
        evt.status === "start" ? "running" : (evt.status as DeleteStepStatus);
      const detail =
        evt.step === "dkim" && evt.status === "done" && evt.count !== undefined
          ? `${evt.count} registro(s) removidos`
          : "detail" in evt
          ? evt.detail
          : undefined;
      updateStep(evt.step, { status, detail });
      return;
    }
    if (evt.step === "complete") {
      setDeleteState((prev) =>
        prev
          ? {
              ...prev,
              phase: "success",
              summary: { mailboxesRemoved: evt.mailboxesRemoved, stalwartErrors: evt.stalwartErrors },
            }
          : prev,
      );
      qc.invalidateQueries({ queryKey: ["domains"] });
      qc.invalidateQueries({ queryKey: ["domains", "plan"] });
      return;
    }
    if (evt.step === "error") {
      setDeleteState((prev) => (prev ? { ...prev, phase: "error", error: evt.detail } : prev));
    }
  };

  const startDelete = async () => {
    if (!deleteState) return;
    setDeleteState({ ...deleteState, phase: "running", steps: [], error: null });
    try {
      await deleteDomainStream(deleteState.id, handleDeleteEvent);
    } catch (err) {
      setDeleteState((prev) =>
        prev
          ? {
              ...prev,
              phase: "error",
              error: err instanceof Error ? err.message : "Falha ao excluir domínio",
            }
          : prev,
      );
    }
  };

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
                      onClick={() =>
                        setDeleteState({
                          id: domain.id,
                          name: domain.name,
                          mailboxCount: domain.mailboxCount,
                          phase: "confirm",
                          steps: [],
                          error: null,
                          summary: null,
                        })
                      }
                      title="Excluir domínio"
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

      {deleteState ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-domain-title"
            className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111] sm:rounded-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-hub-border">
              <div className="flex items-start gap-3">
                <div
                  className={
                    deleteState.phase === "success"
                      ? "rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  }
                >
                  {deleteState.phase === "success" ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <AlertTriangle className="size-5" />
                  )}
                </div>
                <div>
                  <h2
                    id="delete-domain-title"
                    className="text-base font-semibold text-neutral-900 dark:text-white"
                  >
                    {deleteState.phase === "success"
                      ? "Domínio excluído"
                      : deleteState.phase === "running"
                      ? "Excluindo domínio…"
                      : "Excluir domínio"}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {deleteState.phase === "confirm"
                      ? "Esta ação não pode ser desfeita."
                      : deleteState.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleteState.phase === "running"}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-700 dark:text-neutral-300">
              {deleteState.phase === "confirm" ? (
                <div className="space-y-3">
                  <p>
                    Tem certeza que deseja excluir o domínio{" "}
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {deleteState.name}
                    </span>
                    ?
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-600 dark:text-neutral-400">
                    <li>
                      {deleteState.mailboxCount} conta
                      {deleteState.mailboxCount !== 1 ? "s" : ""} de email
                      {deleteState.mailboxCount !== 1 ? " serão removidas" : " será removida"} permanentemente
                    </li>
                    <li>Todos os emails recebidos e enviados serão apagados</li>
                    <li>Registros DKIM e configurações do domínio serão excluídos do servidor de email</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  {deleteState.phase === "success" ? (
                    <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                      Domínio <span className="font-semibold">{deleteState.name}</span> excluído com sucesso.
                      {deleteState.summary?.mailboxesRemoved
                        ? ` ${deleteState.summary.mailboxesRemoved} conta${deleteState.summary.mailboxesRemoved !== 1 ? "s" : ""} removida${deleteState.summary.mailboxesRemoved !== 1 ? "s" : ""}.`
                        : ""}
                    </div>
                  ) : null}

                  {deleteState.steps.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      Preparando exclusão…
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {deleteState.steps.map((step) => (
                        <li
                          key={step.key}
                          className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-hub-border dark:bg-[#141414]"
                        >
                          <span className="mt-0.5 shrink-0">
                            {step.status === "running" ? (
                              <Loader2 className="size-3.5 animate-spin text-neutral-500" />
                            ) : step.status === "done" ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : step.status === "error" ? (
                              <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
                            ) : step.status === "skipped" ? (
                              <CheckCircle2 className="size-3.5 text-neutral-400" />
                            ) : (
                              <Clock className="size-3.5 text-neutral-400" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={
                                step.status === "pending"
                                  ? "text-neutral-500 dark:text-neutral-500"
                                  : "text-neutral-800 dark:text-neutral-200"
                              }
                            >
                              {step.label}
                            </p>
                            {step.detail ? (
                              <p
                                className={
                                  step.status === "error"
                                    ? "mt-0.5 text-[11px] text-red-600 dark:text-red-400"
                                    : "mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400"
                                }
                              >
                                {step.detail}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {deleteState.summary?.stalwartErrors && deleteState.summary.stalwartErrors.length > 0 ? (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                      <p className="font-semibold">Avisos do servidor de email:</p>
                      <ul className="mt-1 list-disc pl-4">
                        {deleteState.summary.stalwartErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {deleteState.error ? (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {deleteState.error}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-hub-border">
              {deleteState.phase === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={startDelete}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Excluir definitivamente
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={deleteState.phase === "running"}
                  className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  {deleteState.phase === "running" ? "Aguarde…" : "Fechar"}
                </button>
              )}
            </footer>
          </div>
        </div>
      ) : null}

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
