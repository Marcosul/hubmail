"use client";

import Link from "next/link";
import { EllipsisVertical, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxTableActionsCell } from "@/components/inboxes/inbox-table-actions-cell";
import { InboxTableRow } from "@/components/inboxes/inbox-table-row";
import { useDeleteMailbox, useMailboxes, useRotateMailboxCredential } from "@/hooks/use-mail";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";

function formatDate(value: string | Date | null | undefined, locale: AppLocale) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(getLocaleDateFormat(locale));
}

export default function InboxesPage() {
  const { locale, messages } = useI18n();
  const copy = messages.inboxes;
  const { data: mailboxes, isLoading, isError } = useMailboxes();
  const rotateCredential = useRotateMailboxCredential();
  const removeMailbox = useDeleteMailbox();
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [editingMailbox, setEditingMailbox] = useState<{ id: string; address: string } | null>(null);
  const [credentialUsername, setCredentialUsername] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const normalizedPassword = credentialPassword.trim();
  const canSubmitCredential = Boolean(editingMailbox) && normalizedPassword.length >= 6;

  function openCredentialDialog(mailbox: { id: string; address: string }) {
    setEditingMailbox(mailbox);
    setCredentialUsername(mailbox.address);
    setCredentialPassword("");
    setDialogError(null);
    setOpenMenu(null);
  }

  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-inbox-actions-menu]")) return;
      if (target.closest("[data-inbox-actions-trigger]")) return;
      setOpenMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    const closeOnViewportChange = () => setOpenMenu(null);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
    };
  }, [openMenu]);

  async function submitCredentialUpdate() {
    if (!editingMailbox) return;
    if (normalizedPassword.length < 6) {
      setDialogError(copy.passwordMinSize);
      return;
    }
    try {
      await rotateCredential.mutateAsync({
        mailboxId: editingMailbox.id,
        username: credentialUsername.trim() || editingMailbox.address,
        password: normalizedPassword,
      });
      setEditingMailbox(null);
      setCredentialUsername("");
      setCredentialPassword("");
      setDialogError(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : copy.rotateCredentialError);
    }
  }

  async function handleDelete(mailbox: { id: string; address: string }) {
    const confirmed = window.confirm(copy.deleteMailboxConfirm.replace("{address}", mailbox.address));
    if (!confirmed) return;
    try {
      await removeMailbox.mutateAsync({ mailboxId: mailbox.id });
      setOpenMenu(null);
    } catch {
      window.alert(copy.deleteMailboxError);
    }
  }

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
      actions={
        <>
          <Link
            href="/dashboard/inboxes/unified"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {copy.unifiedInbox}
          </Link>
          <Link
            href="/dashboard/inboxes/smtp"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {messages.smtp.title}
          </Link>
          <Link
            href="/dashboard/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {copy.createInbox}
          </Link>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
              <tr>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.address}</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.displayName}</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.domain}</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.credential}</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">{copy.created}</th>
              <th className="w-12 px-4 py-3" aria-label={messages.common.actions} />
              </tr>
            </thead>
            <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  {copy.loading}
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-red-500">
                  {copy.loadError}
                </td>
              </tr>
            ) : mailboxes && mailboxes.length > 0 ? (
              mailboxes.map((row) => (
                <InboxTableRow key={row.id} inboxId={row.id} openFolder="inbox">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-900 dark:text-neutral-200">
                    {row.address}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {row.displayName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">{row.domain}</td>
                  <td className="px-4 py-3">
                    {row.hasCredential ? (
                      <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {copy.configured}
                      </span>
                    ) : (
                      <span className="inline-flex rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                        {copy.missing}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">
                    {formatDate(row.createdAt, locale)}
                  </td>
                  <InboxTableActionsCell>
                    <div className="relative">
                      <button
                        type="button"
                        data-inbox-actions-trigger
                        className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                        aria-label={messages.common.actions}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          const menuWidth = 192;
                          const left = Math.max(
                            8,
                            Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
                          );
                          const top = rect.bottom + 6;
                          setOpenMenu((curr) =>
                            curr?.id === row.id ? null : { id: row.id, top, left },
                          );
                        }}
                      >
                        <EllipsisVertical className="size-4" />
                      </button>
                      {openMenu?.id === row.id ? (
                        <div
                          data-inbox-actions-menu
                          className="fixed z-40 min-w-48 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-hub-border dark:bg-[#111]"
                          style={{ top: openMenu.top, left: openMenu.left }}
                        >
                          <button
                            type="button"
                            onClick={() => openCredentialDialog({ id: row.id, address: row.address })}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10"
                          >
                            <KeyRound className="size-4" />
                            {copy.configureCredentials}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete({ id: row.id, address: row.address })}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
                            {copy.delete}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </InboxTableActionsCell>
                </InboxTableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  {copy.emptyStart}
                  <Link href="/dashboard/inboxes/new" className="mx-1 font-medium underline">
                    {copy.createInbox}
                  </Link>
                  {copy.emptyEnd}
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center">
          <span>
            {mailboxes?.length ?? 0} {copy.count}
          </span>
        </div>
      </div>
      {editingMailbox ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-hub-border dark:bg-[#111]">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {copy.configureCredentials}
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {editingMailbox.address}
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCredentialUpdate();
              }}
            >
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">
                  {copy.credentialUsername}
                </span>
                <input
                  value={credentialUsername}
                  onChange={(event) => setCredentialUsername(event.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100"
                  placeholder="contato@dominio.com"
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">
                  {copy.credentialPassword}
                </span>
                <input
                  type="password"
                  value={credentialPassword}
                  onChange={(event) => {
                    setCredentialPassword(event.target.value);
                    if (dialogError) setDialogError(null);
                  }}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100"
                  placeholder={copy.credentialPasswordPlaceholder}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </label>
              {dialogError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{dialogError}</p>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{copy.passwordMinSize}</p>
              )}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMailbox(null)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitCredential || rotateCredential.isPending}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {rotateCredential.isPending ? copy.savingCredential : messages.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
