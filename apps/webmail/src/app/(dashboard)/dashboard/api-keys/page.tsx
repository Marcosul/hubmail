import { KeyRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export default async function ApiKeysPage() {
  const copy = getMessages(await getServerLocale()).apiKeys;

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
      actions={
        <button
          type="button"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white sm:w-auto dark:bg-white dark:text-neutral-900"
        >
          {copy.create}
        </button>
      }
    >
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 py-16 text-center dark:border-hub-border sm:py-24">
        <KeyRound className="mb-4 size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{copy.emptyTitle}</h2>
        <p className="mt-2 max-w-md text-center text-sm text-neutral-500 dark:text-neutral-400">
          {copy.emptyDescription}
        </p>
      </div>
    </DashboardShell>
  );
}
