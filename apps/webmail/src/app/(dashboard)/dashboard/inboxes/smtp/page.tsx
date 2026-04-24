import Link from "next/link";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export default async function SmtpImapPage() {
  const messages = getMessages(await getServerLocale());
  const copy = messages.smtp;

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <Link
        href="/dashboard/inboxes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {messages.common.back}
      </Link>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/50 p-5 dark:border-hub-border dark:bg-[#141414]">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{copy.apiKey}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {copy.apiKeyDescription}
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
            aria-label={copy.showPassword}
          >
            <Eye className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <select
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
          defaultValue="generic"
          aria-label={copy.platformLabel}
        >
          <option value="generic">{copy.platform}</option>
        </select>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          <Download className="size-4" aria-hidden />
          {copy.exportCsv}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-hub-border">
        <table className="min-w-[900px] w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
            <tr>
              {copy.headers.map(
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
              <td className="px-3 py-2 text-neutral-500">{copy.enterApiKey}</td>
              <td className="px-3 py-2 font-mono">mail.hubmail.to</td>
              <td className="px-3 py-2">993</td>
              <td className="px-3 py-2 font-mono">admin@hubmail.to</td>
              <td className="px-3 py-2 text-neutral-500">{copy.enterApiKey}</td>
              <td className="px-3 py-2">
                <button type="button" className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white">
                  {copy.copy}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
