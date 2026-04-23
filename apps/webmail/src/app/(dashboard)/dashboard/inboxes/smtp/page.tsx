import Link from "next/link";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function SmtpImapPage() {
  return (
    <DashboardShell title="SMTP/IMAP credentials" subtitle="Export credentials for cold email platforms.">
      <Link
        href="/dashboard/inboxes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/50 p-5 dark:border-hub-border dark:bg-[#141414]">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">API key (required)</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          For security, keys are not stored in plaintext. Enter yours below to populate the password field for all
          inboxes.
        </p>
        <div className="relative mt-3">
          <input
            type="password"
            placeholder="hm_live_…"
            className="w-full rounded-md border border-neutral-200 bg-white py-2.5 pl-3 pr-10 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            autoComplete="off"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label="Show password"
          >
            <Eye className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
          defaultValue="generic"
          aria-label="Platform"
        >
          <option value="generic">Platform: Generic</option>
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          <Download className="size-4" aria-hidden />
          Export as CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="min-w-[900px] w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
            <tr>
              {["Email", "SMTP host", "SMTP port", "SMTP user", "SMTP password", "IMAP host", "IMAP port", "IMAP user", "IMAP password", "Actions"].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200 dark:border-hub-border">
              <td className="px-3 py-2 font-mono text-neutral-800 dark:text-neutral-200">admin@hubmail.to</td>
              <td className="px-3 py-2 font-mono">mail.hubmail.to</td>
              <td className="px-3 py-2">465</td>
              <td className="px-3 py-2 font-mono">admin@hubmail.to</td>
              <td className="px-3 py-2 text-neutral-500">Enter API key</td>
              <td className="px-3 py-2 font-mono">mail.hubmail.to</td>
              <td className="px-3 py-2">993</td>
              <td className="px-3 py-2 font-mono">admin@hubmail.to</td>
              <td className="px-3 py-2 text-neutral-500">Enter API key</td>
              <td className="px-3 py-2">
                <button type="button" className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white">
                  Copy
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
