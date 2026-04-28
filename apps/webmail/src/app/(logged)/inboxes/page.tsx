"use client";

import Link from "next/link";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ActionMenu,
  DataList,
  DataListError,
  DataListLoading,
  DataListPagination,
  DataListToolbar,
  type ActionMenuItem,
} from "@/components/data-list";
import { EditInboxDialog } from "@/components/inboxes/edit-inbox-dialog";
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
  const [editingMailbox, setEditingMailbox] = useState<{ id: string; address: string } | null>(null);
  const [editingFull, setEditingFull] = useState<{ id: string; address: string } | null>(null);
  const [credentialUsername, setCredentialUsername] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedPassword = credentialPassword.trim();
  const canSubmitCredential = Boolean(editingMailbox) && normalizedPassword.length >= 6;

  const filteredMailboxes = useMemo(() => {
    if (!mailboxes) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mailboxes;
    return mailboxes.filter(
      (m) =>
        m.address.toLowerCase().includes(q) ||
        (m.displayName ?? "").toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q),
    );
  }, [mailboxes, searchQuery]);

  function openCredentialDialog(mailbox: { id: string; address: string }) {
    setEditingMailbox(mailbox);
    setCredentialUsername(mailbox.address);
    setCredentialPassword("");
    setDialogError(null);
  }

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
            href="/inboxes/groups"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {copy.groupsTitle}
          </Link>
          <Link
            href="/inboxes/unified"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {copy.unifiedInbox}
          </Link>
          <Link
            href="/inboxes/smtp"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {messages.smtp.title}
          </Link>
          <Link
            href="/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {copy.createInbox}
          </Link>
        </>
      }
    >
      <DataList
        toolbar={
          <DataListToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={`${copy.address}, ${copy.displayName} ou ${copy.domain}`}
          />
        }
        footer={
          <DataListPagination
            summary={
              <span className="text-xs">
                {filteredMailboxes.length} {copy.count}
              </span>
            }
          />
        }
      >
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
                  <td colSpan={6}>
                    <DataListLoading label={copy.loading} />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6}>
                    <DataListError label={copy.loadError} />
                  </td>
                </tr>
              ) : filteredMailboxes.length > 0 ? (
                filteredMailboxes.map((row) => {
                  const menuItems: ActionMenuItem[] = [
                    {
                      key: "edit",
                      label: copy.editInbox,
                      icon: Pencil,
                      onClick: () => setEditingFull({ id: row.id, address: row.address }),
                    },
                    {
                      key: "credentials",
                      label: copy.configureCredentials,
                      icon: KeyRound,
                      onClick: () => openCredentialDialog({ id: row.id, address: row.address }),
                    },
                    {
                      key: "delete",
                      label: copy.delete,
                      icon: Trash2,
                      danger: true,
                      separatorAbove: true,
                      onClick: () => handleDelete({ id: row.id, address: row.address }),
                    },
                  ];
                  return (
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
                        <ActionMenu items={menuItems} ariaLabel={messages.common.actions} />
                      </InboxTableActionsCell>
                    </InboxTableRow>
                  );
                })
              ) : mailboxes && mailboxes.length > 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    Nenhuma inbox encontrada para &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    {copy.emptyStart}
                    <Link href="/inboxes/new" className="mx-1 font-medium underline">
                      {copy.createInbox}
                    </Link>
                    {copy.emptyEnd}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataList>
      {editingFull ? (
        <EditInboxDialog
          mailboxId={editingFull.id}
          address={editingFull.address}
          onClose={() => setEditingFull(null)}
        />
      ) : null}
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
