"use client";

import { Loader2, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ActionMenu,
  DataList,
  DataListLoading,
  DataListPagination,
  DataListToolbar,
  type ActionMenuItem,
} from "@/components/data-list";
import { WorkspaceMembersDialog } from "@/components/workspace/workspace-members-dialog";
import { WorkspaceSettingsDialog } from "@/components/workspace/workspace-settings-dialog";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import { useCreateWorkspace, useWorkspaces } from "@/hooks/use-workspace";
import type { WorkspaceSummary } from "@hubmail/types";

type ActionDialog =
  | { kind: "settings"; workspace: WorkspaceSummary }
  | { kind: "members"; workspace: WorkspaceSummary }
  | null;

export default function WorkspacesPage() {
  const { locale, messages } = useI18n();
  const copy = messages.workspaces;
  const { data: workspaces, isLoading } = useWorkspaces();

  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dateFormatter = new Intl.DateTimeFormat(getLocaleDateFormat(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const list = useMemo(() => {
    const all = workspaces ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.organization?.name?.toLowerCase().includes(q),
    );
  }, [workspaces, searchQuery]);

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
      actions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
        >
          <Plus className="size-4" aria-hidden />
          {copy.createWorkspace.replace(/^\+\s*/, "")}
        </button>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.name}</th>
                <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.created}</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-500">
                    <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                    <span className="sr-only">{copy.loading}</span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-500">
                    {copy.empty}
                  </td>
                </tr>
              ) : (
                list.map((workspace) => {
                  const createdAt = new Date(workspace.createdAt as string);
                  const isAdmin = workspace.role === "OWNER" || workspace.role === "ADMIN";
                  const isOwner = workspace.role === "OWNER";
                  const isMenuOpen = openMenuId === workspace.id;
                  return (
                    <tr key={workspace.id} className="border-b border-neutral-200 last:border-0 dark:border-hub-border">
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{workspace.name}</td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">
                        {dateFormatter.format(createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end" ref={isMenuOpen ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(isMenuOpen ? null : workspace.id)}
                            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            aria-label={messages.common.actions}
                            aria-expanded={isMenuOpen}
                            aria-haspopup="true"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                          {isMenuOpen ? (
                            <div className="absolute right-0 top-7 z-30 w-44 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-hub-border dark:bg-hub-card">
                              <button
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDialog({ kind: "settings", workspace });
                                }}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-white/5"
                              >
                                <Pencil className="size-4" aria-hidden />
                                {copy.actions.rename}
                              </button>
                              <button
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDialog({ kind: "members", workspace });
                                }}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-white/5"
                              >
                                <Share2 className="size-4" aria-hidden />
                                {copy.actions.share}
                              </button>
                              <button
                                type="button"
                                disabled={!isOwner}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDialog({ kind: "settings", workspace });
                                }}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="size-4" aria-hidden />
                                {copy.actions.delete}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span>{messages.common.rowsPerPage}</span>
            <select
              className="rounded border border-neutral-200 bg-white px-2 py-1 dark:border-hub-border dark:bg-hub-card dark:text-white"
              defaultValue="30"
            >
              <option>30</option>
            </select>
          </div>
          <span>{copy.pageCount.replace("{count}", String(list.length))}</span>
        </div>
      </div>

      {dialog?.kind === "settings" ? (
        <WorkspaceSettingsDialog workspace={dialog.workspace} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "members" ? (
        <WorkspaceMembersDialog workspace={dialog.workspace} onClose={() => setDialog(null)} />
      ) : null}
      {createOpen ? <CreateWorkspaceDialog onClose={() => setCreateOpen(false)} /> : null}
    </DashboardShell>
  );
}

function CreateWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const copy = messages.workspaces;
  const [name, setName] = useState("");
  const create = useCreateWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ name: trimmed }, { onSuccess: () => onClose() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{copy.createDialogTitle}</h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label={messages.common.close}
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {copy.newName}
            </span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={64}
              placeholder={copy.namePlaceholder}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </label>
          {create.isError ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{create.error.message}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {copy.cancel}
            </button>
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {copy.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
