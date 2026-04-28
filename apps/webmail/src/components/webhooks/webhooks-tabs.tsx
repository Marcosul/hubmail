"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ListChecks, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

const TABS = [
  { href: "/webhooks/endpoints", key: "endpoints" as const, icon: Radio },
  { href: "/webhooks/event-catalog", key: "eventCatalog" as const, icon: BookOpen },
  { href: "/webhooks/logs", key: "logs" as const, icon: ListChecks },
  { href: "/webhooks/activity", key: "activity" as const, icon: Activity },
];

export function WebhooksTabs() {
  const pathname = usePathname();
  const { messages } = useI18n();
  const labels = messages.webhooks.tabs;

  return (
    <nav
      className="flex flex-wrap items-center gap-1 border-b border-neutral-200 dark:border-hub-border"
      aria-label="Webhooks tabs"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            <Icon className="size-4" />
            {labels[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}
