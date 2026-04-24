"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { useMailboxes } from "@/hooks/use-mail";

export default function ComposePage() {
  const { data: mailboxes, isLoading } = useMailboxes();
  const firstMailbox = mailboxes?.[0];

  return (
    <DashboardShell title="Compose" subtitle="New message">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex gap-2">
          <Link href="/dashboard/inboxes/unified" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Cancel
          </Link>
        </div>
        {isLoading ? (
          <p className="text-sm text-neutral-500">A carregar mailboxes…</p>
        ) : !firstMailbox ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-hub-border">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Precisa associar uma mailbox antes de escrever.
            </p>
            <Link
              href="/dashboard/inboxes/new"
              className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Associar mailbox
            </Link>
          </div>
        ) : (
          <EmailComposerCard className="min-h-[520px]" mailboxId={firstMailbox.id} />
        )}
      </div>
    </DashboardShell>
  );
}
