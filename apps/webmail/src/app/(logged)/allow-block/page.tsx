import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

function ListCard({ title, addLabel, emptyLabel, rowsPerPageLabel }: { title: string; addLabel: string; emptyLabel: string; rowsPerPageLabel: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-hub-border dark:bg-[#141414]">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-hub-border">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">{title}</span>
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          + {addLabel}
        </button>
      </div>
      <div className="flex min-h-[140px] items-center justify-center px-4 py-8 text-sm text-neutral-500 dark:text-neutral-500">
        {emptyLabel}
      </div>
      <div className="flex flex-col gap-2 border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-hub-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>{rowsPerPageLabel}</span>
          <select className="rounded border border-neutral-200 bg-white px-1 dark:border-hub-border dark:bg-hub-card dark:text-white" defaultValue="30">
            <option>30</option>
          </select>
        </div>
        <span>‹ ›</span>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">{label}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default async function AllowBlockPage() {
  const messages = getMessages(await getServerLocale());
  const copy = messages.lists;
  const listCardLabels = {
    addLabel: messages.common.add,
    emptyLabel: messages.common.noEntries,
    rowsPerPageLabel: messages.common.rowsPerPage,
  };

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <div className="space-y-10">
        <Section label={copy.receive}>
          <ListCard title={copy.allowList} {...listCardLabels} />
          <ListCard title={copy.blockList} {...listCardLabels} />
        </Section>
        <Section label={copy.send}>
          <ListCard title={copy.allowList} {...listCardLabels} />
          <ListCard title={copy.blockList} {...listCardLabels} />
        </Section>
        <Section label={copy.reply}>
          <ListCard title={copy.allowList} {...listCardLabels} />
          <ListCard title={copy.blockList} {...listCardLabels} />
        </Section>
      </div>
    </DashboardShell>
  );
}
