"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  ChevronDown,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Leaf,
  ListFilter,
  LogOut,
  Mail,
  Moon,
  Sun,
  Webhook,
  MessageCircle,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/api/rest/generic";

const nav = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inboxes", label: "Inboxes", icon: Inbox },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/allow-block", label: "Allow/Block Lists", icon: ListFilter },
  { href: "/dashboard/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/dashboard/pods", label: "Pods", icon: Leaf },
] as const;

type AppSidebarProps = {
  userLabel: string;
};

export function AppSidebar({ userLabel }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50",
        "dark:border-hub-border dark:bg-[#0a0a0a]",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-hub-border">
        <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          <Mail className="size-4" aria-hidden />
        </div>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-200/80 dark:text-white dark:hover:bg-white/5"
        >
          <span className="truncate">HubMail</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-neutral-200 p-3 dark:border-hub-border">
        <a
          href="https://stalw.art/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          Discord
        </a>
        <a
          href="https://stalw.art/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
        >
          <BookOpen className="size-3.5" aria-hidden />
          Documentation
        </a>
        <a
          href="https://github.com/stalwartlabs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
        >
          <MessageSquare className="size-3.5" aria-hidden />
          Feedback
        </a>

        <div className="flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-500">Theme</span>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            disabled={!mounted}
            className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
            aria-label="Toggle light or dark mode"
          >
            {!mounted ? null : resolvedTheme === "dark" ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
            {userLabel.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{userLabel}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            >
              <LogOut className="size-3" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
