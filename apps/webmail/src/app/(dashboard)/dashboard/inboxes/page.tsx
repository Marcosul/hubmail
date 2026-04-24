"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxTableActionsCell } from "@/components/inboxes/inbox-table-actions-cell";
import { InboxTableRow } from "@/components/inboxes/inbox-table-row";
import { useMailboxes } from "@/hooks/use-mail";
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
            SMTP/IMAP
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
                    <button
                      type="button"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                      aria-label={messages.common.actions}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
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
    </DashboardShell>
  );
}
