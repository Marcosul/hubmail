"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { useMailboxes } from "@/hooks/use-mail";
import { useI18n } from "@/i18n/client";

export default function ComposePage() {
  const { messages } = useI18n();
  const copy = messages.compose;
  const { data: mailboxes, isLoading } = useMailboxes();
  const firstMailbox = mailboxes?.[0];

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex gap-2">
          <Link href="/inboxes/unified" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            {messages.common.cancel}
          </Link>
        </div>
        {isLoading ? (
          <p className="text-sm text-neutral-500">{copy.loadingMailboxes}</p>
        ) : !firstMailbox ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-hub-border">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {copy.needMailbox}
            </p>
            <Link
              href="/inboxes/new"
              className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              {messages.inboxes.associateMailbox}
            </Link>
          </div>
        ) : (
          <EmailComposerCard className="min-h-[520px]" mailboxId={firstMailbox.id} />
        )}
      </div>
    </DashboardShell>
  );
}
