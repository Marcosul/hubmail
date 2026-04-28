"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Settings, Trash2, X, Copy, Check } from "lucide-react";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  setActiveWorkspaceId,
  useWorkspaces,
} from "@/hooks/use-workspace";
import type { WorkspaceSummary } from "@hubmail/types";

type Props = {
  workspace: WorkspaceSummary;
  onClose: () => void;
};

type Resources = {
  domains: number;
  mailboxes: number;
  webhooks: number;
};

export function WorkspaceSettingsDialog({ workspace, onClose }: Props) {
  const [name, setName] = useState(workspace.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resources, setResources] = useState<Resources | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const update = useUpdateWorkspace(workspace.id);
  const remove = useDeleteWorkspace();
  const { data: workspaces } = useWorkspaces();
  const nameRef = useRef<HTMLInputElement>(null);

  const isAdmin = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const isOwner = workspace.role === "OWNER";

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Carregar contagem de recursos quando expandir confirmDelete
  useEffect(() => {
    if (confirmDelete && !resources && !loadingResources) {
      loadResources();
    }
  }, [confirmDelete]);

  async function loadResources() {
    setLoadingResources(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/resources/count`, {
        headers: {
          "Authorization": `Bearer ${await getAuthToken()}`,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as Resources;
        setResources(data);
      }
    } catch (error) {
      console.error("Erro ao carregar recursos:", error);
    } finally {
      setLoadingResources(false);
    }
  }

  async function getAuthToken() {
    // TODO: Implemente com seu SDK de autenticação (Supabase, etc)
    const token = localStorage.getItem("auth_token");
    return token || "";
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === workspace.name) return;
    update.mutate(
      { name: name.trim() },
      { onSuccess: () => onClose() },
    );
  }

  function handleCopyName() {
    navigator.clipboard.writeText(workspace.name);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  }

  function handleDelete() {
    remove.mutate(workspace.id, {
      onSuccess: () => {
        const next = workspaces?.find((w) => w.id !== workspace.id);
        if (next) setActiveWorkspaceId(next.id);
        onClose();
      },
    });
  }

  const totalResources = resources
    ? resources.domains + resources.mailboxes + resources.webhooks
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <Settings className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Definições do workspace
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {workspace.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Rename */}
          {isAdmin && (
            <form onSubmit={handleRename}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Nome
              </label>
              <div className="flex gap-2">
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                  minLength={2}
                  maxLength={64}
                />
                <button
                  type="submit"
                  disabled={update.isPending || !name.trim() || name === workspace.name}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {update.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Pencil className="size-4" />
                  )}
                  Guardar
                </button>
              </div>
              {update.isError && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {update.error.message}
                </p>
              )}
            </form>
          )}

          {/* Divider */}
          {isAdmin && isOwner && (
            <div className="border-t border-neutral-100 dark:border-neutral-800" />
          )}

          {/* Danger zone */}
          {isOwner && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/40 dark:bg-red-950/20">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                Zona de perigo
              </p>

              {!confirmDelete ? (
                <div>
                  <p className="mb-3 text-sm text-neutral-700 dark:text-neutral-300">
                    Apagar o workspace remove permanentemente todos os dados associados — domínios, inboxes e configurações.
                  </p>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="size-4" />
                    Apagar workspace
                  </button>
                </div>
              ) : (
                <div>
                  {/* Mostrar recursos que serão deletados */}
                  <div className="mb-4 rounded-lg border border-red-300/30 bg-red-50/50 p-3 dark:border-red-700/30 dark:bg-red-950/10">
                    <p className="mb-2 text-xs font-semibold text-red-700 dark:text-red-300">
                      Recursos que serão deletados:
                    </p>

                    {loadingResources ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin text-red-500" />
                        <span className="text-xs text-red-600 dark:text-red-400">
                          Carregando recursos...
                        </span>
                      </div>
                    ) : resources ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {resources.domains}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {resources.domains === 1 ? "Domínio" : "Domínios"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {resources.mailboxes}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {resources.mailboxes === 1 ? "Inbox" : "Inboxes"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {resources.webhooks}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {resources.webhooks === 1 ? "Webhook" : "Webhooks"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {totalResources > 0 && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Total: <span className="font-semibold">{totalResources}</span> {totalResources === 1 ? "recurso" : "recursos"}
                      </p>
                    )}
                  </div>

                  {/* Nome do workspace com copiar */}
                  <p className="mb-2 text-sm text-neutral-800 dark:text-neutral-200">
                    Escreva{" "}
                    <button
                      type="button"
                      onClick={handleCopyName}
                      className="group inline-flex items-center gap-1 rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600"
                      title="Clique para copiar"
                    >
                      {workspace.name}
                      {copiedName ? (
                        <Check className="size-3 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="size-3 text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200" />
                      )}
                    </button>
                    {" "}para confirmar:
                  </p>
                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={workspace.name}
                    className="mb-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-700/60 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={remove.isPending || deleteConfirmText !== workspace.name}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {remove.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Deletando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="size-4" />
                          Apagar definitivamente
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteConfirmText("");
                        setResources(null);
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Cancelar
                    </button>
                  </div>
                  {remove.isError && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {remove.error.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

