import { KeyRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ApiKeysPage() {
  return (
    <DashboardShell
      title="API keys"
      subtitle="Manage API keys for authenticating with the HubMail API."
      actions={
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          + Create API key
        </button>
      }
    >
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 py-24 dark:border-hub-border">
        <KeyRound className="mb-4 size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">No API keys configured</h2>
        <p className="mt-2 max-w-md text-center text-sm text-neutral-500 dark:text-neutral-400">
          Create your first API key to start using the HubMail API.
        </p>
      </div>
    </DashboardShell>
  );
}
