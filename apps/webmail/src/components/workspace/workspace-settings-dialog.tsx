"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
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
        // Muda para o primeiro workspace restante
        const next = workspaces?.find((w) => w.id !== workspace.id);
        if (next) setActiveWorkspaceId(next.id);
        onClose();
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X className="size-4" />
        </button>

        <h2 className="mb-5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Definições do workspace
        </h2>

        {/* Rename */}
        {isAdmin && (
          <form onSubmit={handleRename} className="mb-6">
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nome
            </label>
            <div className="flex gap-2">
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                minLength={2}
                maxLength={64}
              />
              <button
                type="submit"
                disabled={update.isPending || !name.trim() || name === workspace.name}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
              <p className="mt-1 text-xs text-red-500">{update.error.message}</p>
            )}
          </form>
        )}

        {/* Delete zone */}
        {isOwner && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/30">
            <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
              Zona de perigo
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                <Trash2 className="size-4" />
                Apagar workspace
              </button>
            ) : (
              <div>
                <p className="mb-2 text-sm text-red-700 dark:text-red-300">
                  Escreva{" "}
                  <strong className="font-mono">{workspace.name}</strong> para confirmar:
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={workspace.name}
                  className="mb-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={
                      remove.isPending || deleteConfirmText !== workspace.name
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
                    className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    Cancelar
                  </button>
                </div>
                {remove.isError && (
                  <p className="mt-1 text-xs text-red-500">{remove.error.message}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
