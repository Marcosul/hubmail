"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Settings, Trash2, X } from "lucide-react";
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

export function WorkspaceSettingsDialog({ workspace, onClose }: Props) {
  const [name, setName] = useState(workspace.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const update = useUpdateWorkspace(workspace.id);
  const remove = useDeleteWorkspace();
  const { data: workspaces } = useWorkspaces();
  const nameRef = useRef<HTMLInputElement>(null);

  const isAdmin = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const isOwner = workspace.role === "OWNER";

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === workspace.name) return;
    update.mutate(
      { name: name.trim() },
      { onSuccess: () => onClose() },
    );
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
                  <p className="mb-2 text-sm text-neutral-800 dark:text-neutral-200">
                    Escreva{" "}
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100">
                      {workspace.name}
                    </span>{" "}
                    para confirmar:
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
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Apagar definitivamente
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteConfirmText("");
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
