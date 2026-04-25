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
  Menu,
  Moon,
  Settings,
  Sun,
  Webhook,
  MessageCircle,
  BookOpen,
  MessageSquare,
  CreditCard,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/api/rest/generic";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { getLocaleLabel, useI18n } from "@/i18n/client";
import { useWorkspaces } from "@/hooks/use-workspace";

const nav = [
  { href: "/dashboard", labelKey: "overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/inboxes", labelKey: "inboxes", icon: Inbox },
  { href: "/dashboard/domains", labelKey: "domains", icon: Globe },
  { href: "/dashboard/webhooks", labelKey: "webhooks", icon: Webhook },
  { href: "/dashboard/agents", labelKey: "agents", icon: Bot },
  { href: "/dashboard/api-keys", labelKey: "apiKeys", icon: KeyRound },
  { href: "/dashboard/allow-block", labelKey: "allowBlock", icon: ListFilter },
  { href: "/dashboard/metrics", labelKey: "metrics", icon: BarChart3 },
  { href: "/dashboard/pods", labelKey: "pods", icon: Leaf },
] as const;

type AppSidebarProps = {
  userLabel: string;
};

export function AppSidebar({ userLabel }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, messages } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const { data: workspaces } = useWorkspaces();
  const activeWorkspace = workspaces?.[0];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!settingsOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const node = settingsMenuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  function handleLocaleChange(nextLocale: AppLocale) {
    setLocale(nextLocale);
    router.refresh();
  }

  async function handleSignOut() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-hub-border">
        <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          <Mail className="size-4" aria-hidden />
        </div>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-200/80 dark:text-white dark:hover:bg-white/5"
        >
          <span className="truncate">{activeWorkspace?.organization?.name ?? "HubMail"}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/80 dark:hover:bg-white/5 lg:hidden"
          aria-label={messages.sidebar.closeNavigation}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, labelKey, icon: Icon, ...rest }) => {
          const exact = "exact" in rest ? (rest as { exact?: boolean }).exact : undefined;
          const active = isActive(href, exact);
          const label = messages.sidebar.nav[labelKey];
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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
        <Link
          href="/dashboard/upgrade"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
            isActive("/dashboard/upgrade")
              ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
              : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
          )}
        >
          <CreditCard className="size-3.5" aria-hidden />
          Upgrade
        </Link>
        <a
          href="https://discord.gg/stalwart"
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
          {messages.common.documentation}
        </a>
        <a
          href="https://github.com/stalwartlabs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
        >
          <MessageSquare className="size-3.5" aria-hidden />
          {messages.common.feedback}
        </a>

        <div ref={settingsMenuRef} className="relative rounded-md px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
              {userLabel.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {userLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((open) => !open)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/80 hover:text-neutral-800 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                  aria-expanded={settingsOpen}
                  aria-haspopup="true"
                  aria-label={messages.sidebar.openSettings}
                >
                  <Settings className="size-4" aria-hidden />
                </button>
              </div>
              {activeWorkspace && (
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                  {activeWorkspace.name}
                </p>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              >
                <LogOut className="size-3" aria-hidden />
                {messages.common.signOut}
              </button>
            </div>
          </div>

          {settingsOpen ? (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 space-y-3 rounded-md border border-neutral-200 bg-white p-3 shadow-lg dark:border-hub-border dark:bg-hub-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{messages.common.theme}</span>
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  disabled={!mounted}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-200 dark:hover:bg-white/5"
                  aria-label={messages.sidebar.toggleTheme}
                >
                  {!mounted ? null : resolvedTheme === "dark" ? (
                    <Sun className="size-4" aria-hidden />
                  ) : (
                    <Moon className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{messages.common.language}</span>
                <select
                  value={locale}
                  onChange={(event) => handleLocaleChange(event.target.value as AppLocale)}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-200"
                  aria-label={messages.common.language}
                >
                  {SUPPORTED_LOCALES.map((item) => (
                    <option key={item} value={item}>
                      {getLocaleLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 dark:border-hub-border dark:bg-[#0a0a0a] lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <Mail className="size-4" aria-hidden />
          </div>
          <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">HubMail</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200"
          aria-label={messages.sidebar.openNavigation}
        >
          <Menu className="size-4" aria-hidden />
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 cursor-default bg-black/40 lg:hidden"
          aria-label={messages.sidebar.closeNavigation}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] -translate-x-full flex-col border-r border-neutral-200 bg-neutral-50 transition-transform lg:static lg:z-auto lg:w-[260px] lg:translate-x-0",
          mobileOpen && "translate-x-0",
          "dark:border-hub-border dark:bg-[#0a0a0a]",
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
