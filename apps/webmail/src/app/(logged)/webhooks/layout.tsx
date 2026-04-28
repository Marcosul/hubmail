import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WebhooksTabs } from "@/components/webhooks/webhooks-tabs";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export default async function WebhooksLayout({ children }: { children: React.ReactNode }) {
  const messages = getMessages(await getServerLocale());
  return (
    <DashboardShell title={messages.webhooks.title} subtitle={messages.webhooks.subtitle}>
      <WebhooksTabs />
      <div className="pt-6">{children}</div>
    </DashboardShell>
  );
}
