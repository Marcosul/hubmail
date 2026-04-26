"use client";

import { InboxComposeProvider, InboxComposeDockGlobal } from "@/components/inboxes/inbox-compose-provider";

export function DashboardComposeRoot({ children }: { children: React.ReactNode }) {
  return (
    <InboxComposeProvider>
      {children}
      <InboxComposeDockGlobal />
    </InboxComposeProvider>
  );
}
