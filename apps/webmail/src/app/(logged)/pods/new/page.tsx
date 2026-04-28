import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export default async function NewPodPage() {
  const messages = getMessages(await getServerLocale());
  const copy = messages.pods;

  return (
    <DashboardShell title={copy.newTitle} subtitle={copy.newSubtitle}>
      <div className="mx-auto w-full max-w-md space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {copy.name}
          <input className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white" placeholder={copy.namePlaceholder} />
        </label>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link href="/pods" className="flex-1 rounded-md border border-neutral-200 py-2 text-center text-sm dark:border-hub-border dark:hover:bg-white/5">
            {messages.common.cancel}
          </Link>
          <button type="button" className="flex-1 rounded-md bg-neutral-900 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">
            {messages.common.create}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
