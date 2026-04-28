"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Globe, Loader2, Pencil, Plus, Settings, Trash2, CheckCircle, Clock, XCircle, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { DomainSetupWizard } from "@/components/domains/domain-setup-wizard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ActionMenu,
  DataList,
  DataListEmpty,
  DataListLoading,
  DataListPagination,
  DataListToolbar,
  type ActionMenuItem,
} from "@/components/data-list";
import { useI18n } from "@/i18n/client";
import {
  useDomains,
  useDomainPlanInfo,
  useCreateDomain,
  useMigrateDomain,
  deleteDomainStream,
  type Domain,
  type DomainDeleteEvent,
} from "@/hooks/use-domains";
import { useWorkspaces, getActiveWorkspaceId } from "@/hooks/use-workspace";

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
  const migrate = useMigrateDomain();
  const { data: workspaces } = useWorkspaces();
  const activeWorkspaceId = getActiveWorkspaceId();

  const [migrateState, setMigrateState] = useState<{
    id: string;
    name: string;
    targetWorkspaceId: string | null;
    error: string | null;
    success: boolean;
  } | null>(null);

  const eligibleTargets = (workspaces ?? []).filter(
    (w) =>
      w.id !== activeWorkspaceId && (w.role === "OWNER" || w.role === "ADMIN"),
  );

  const startMigrate = async () => {
    if (!migrateState?.targetWorkspaceId) return;
    try {
      await migrate.mutateAsync({
        id: migrateState.id,
        targetWorkspaceId: migrateState.targetWorkspaceId,
      });
      setMigrateState((prev) => (prev ? { ...prev, success: true, error: null } : prev));
    } catch (err) {
      setMigrateState((prev) =>
        prev
          ? {
              ...prev,
              error: err instanceof Error ? err.message : "Falha ao migrar domínio",
            }
          : prev,
      );
    }
  };

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
            href="/upgrade"
            className="shrink-0 rounded-md border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 hover:bg-amber-500/10 dark:text-amber-200"
          >
            {copy.upgradePlan}
          </Link>
        </div>
      ) : null}

      <DataList
        toolbar={
          <DataListToolbar
            badge={
              planInfo ? (
                <>
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
                </>
              ) : null
            }
            searchValue={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setCurrentPage(1);
            }}
            onSearchKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            searchPlaceholder="Procurar ou adicionar novo domínio..."
            actions={
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800 disabled:opacity-30 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <Plus className="size-4" />
                {create.isPending ? "…" : "Adicionar"}
              </button>
            }
            hint={
              atLimit ? (
                <span className="text-amber-600 dark:text-amber-400">
                  Limite atingido.{" "}
                  <Link href="/upgrade" className="font-semibold underline">
                    Faça upgrade
                  </Link>{" "}
                  para adicionar mais domínios.
                </span>
              ) : error ? (
                <span className="text-red-600 dark:text-red-400">{error}</span>
              ) : null
            }
          />
        }
        footer={
          <DataListPagination
            summary={
              totalPages > 1 ? (
                <span className="text-xs">
                  {common.page} <span className="font-medium">{currentPage}</span> {common.of}{" "}
                  <span className="font-medium">{totalPages}</span>
                </span>
              ) : (
                <span className="text-xs">
                  {filteredDomains.length} domínio{filteredDomains.length !== 1 ? "s" : ""}
                </span>
              )
            }
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            previousLabel={common.previous}
            nextLabel={common.next}
          />
        }
      >
        <header className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-400 md:grid md:grid-cols-[1fr_140px_160px_minmax(120px,auto)]">
          <span>Domínio</span>
          <span>Mailboxes</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </header>
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <DataListLoading label={messages.common.loading} />
          ) : !domains || domains.length === 0 ? (
            <DataListEmpty
              icon={Globe}
              title={copy.emptyTitle}
              description={copy.emptyDescription}
            />
          ) : filteredDomains.length === 0 ? (
            <DataListEmpty
              description={`Nenhum domínio encontrado para "${searchQuery}"`}
            />
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
              {paginatedDomains.map((domain) => {
                const menuItems: ActionMenuItem[] = [
                  {
                    key: "edit",
                    label: "Editar",
                    icon: Pencil,
                    onClick: () =>
                      setWizard({ open: true, mode: "configure", id: domain.id, name: domain.name }),
                  },
                  {
                    key: "settings",
                    label: "Configurações",
                    icon: Settings,
                    onClick: () =>
                      setWizard({ open: true, mode: "configure", id: domain.id, name: domain.name }),
                  },
                  {
                    key: "migrate",
                    label: "Migrar p/ workspace",
                    icon: ArrowRightLeft,
                    onClick: () =>
                      setMigrateState({
                        id: domain.id,
                        name: domain.name,
                        targetWorkspaceId: null,
                        error: null,
                        success: false,
                      }),
                  },
                  {
                    key: "delete",
                    label: "Eliminar",
                    icon: Trash2,
                    danger: true,
                    separatorAbove: true,
                    onClick: () =>
                      setDeleteState({
                        id: domain.id,
                        name: domain.name,
                        mailboxCount: domain.mailboxCount,
                        phase: "confirm",
                        steps: [],
                        error: null,
                        summary: null,
                      }),
                  },
                ];
                return (
                  <li
                    key={domain.id}
                    className="grid grid-cols-1 gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_140px_160px_minmax(120px,auto)] md:items-center"
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
                    <div className="flex items-center justify-end">
                      <ActionMenu items={menuItems} ariaLabel="Ações do domínio" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DataList>

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

      {migrateState ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="migrate-domain-title"
            className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111] sm:rounded-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-hub-border">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <ArrowRightLeft className="size-5" />
                </div>
                <div>
                  <h2
                    id="migrate-domain-title"
                    className="text-base font-semibold text-neutral-900 dark:text-white"
                  >
                    Migrar domínio
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {migrateState.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMigrateState(null)}
                disabled={migrate.isPending}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-700 dark:text-neutral-300">
              {migrateState.success ? (
                <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Domínio <span className="font-semibold">{migrateState.name}</span>{" "}
                    migrado com sucesso. As mailboxes e mensagens associadas seguem com o domínio para o novo workspace.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3">
                    Selecione o workspace de destino. Apenas workspaces nos quais
                    você é OWNER ou ADMIN aparecem aqui.
                  </p>
                  {eligibleTargets.length === 0 ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                      Não há outros workspaces onde você tenha permissão de admin.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {eligibleTargets.map((w) => {
                        const selected = migrateState.targetWorkspaceId === w.id;
                        return (
                          <li key={w.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setMigrateState((prev) =>
                                  prev ? { ...prev, targetWorkspaceId: w.id } : prev,
                                )
                              }
                              className={
                                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition " +
                                (selected
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-100"
                                  : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-hub-border dark:bg-[#141414] dark:hover:bg-white/5")
                              }
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{w.name}</p>
                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                  {w.organization?.name} · {w.role}
                                </p>
                              </div>
                              {selected ? (
                                <CheckCircle2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {migrateState.error ? (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {migrateState.error}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-hub-border">
              {migrateState.success ? (
                <button
                  type="button"
                  onClick={() => setMigrateState(null)}
                  className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMigrateState(null)}
                    disabled={migrate.isPending}
                    className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={startMigrate}
                    disabled={!migrateState.targetWorkspaceId || migrate.isPending}
                    className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                  >
                    {migrate.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="size-4" />
                    )}
                    Migrar
                  </button>
                </>
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
