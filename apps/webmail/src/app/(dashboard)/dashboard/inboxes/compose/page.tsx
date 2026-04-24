import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";

export default function ComposePage() {
  return (
    <DashboardShell title="Compose" subtitle="New message">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex gap-2">
          <Link href="/dashboard/inboxes/unified" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Cancel
          </Link>
        </div>
        <EmailComposerCard className="min-h-[520px]" />
      </div>
    </DashboardShell>
  );
}
