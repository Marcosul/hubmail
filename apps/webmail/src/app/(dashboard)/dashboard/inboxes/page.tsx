"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxTableActionsCell } from "@/components/inboxes/inbox-table-actions-cell";
import { InboxTableRow } from "@/components/inboxes/inbox-table-row";
import { useMailboxes } from "@/hooks/use-mail";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function InboxesPage() {
  const { data: mailboxes, isLoading, isError } = useMailboxes();

  return (
    <DashboardShell
      title="Inboxes"
      subtitle="Manage your email inboxes"
      actions={
        <>
          <Link
            href="/dashboard/inboxes/unified"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Unified inbox
          </Link>
          <Link
            href="/dashboard/inboxes/smtp"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            SMTP/IMAP
          </Link>
          <Link
            href="/dashboard/inboxes/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            + Create inbox
          </Link>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Address</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Display name</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Domain</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Credential</th>
              <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Created</th>
              <th className="w-12 px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  A carregar mailboxes…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-red-500">
                  Falha ao obter mailboxes
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
                        configurada
                      </span>
                    ) : (
                      <span className="inline-flex rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                        em falta
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <InboxTableActionsCell>
                    <button
                      type="button"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </InboxTableActionsCell>
                </InboxTableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  Ainda não tem mailboxes. Clique em
                  <Link href="/dashboard/inboxes/new" className="mx-1 font-medium underline">
                    + Create inbox
                  </Link>
                  para adicionar a primeira.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center">
          <span>{mailboxes?.length ?? 0} mailbox(es)</span>
        </div>
      </div>
    </DashboardShell>
  );
}
