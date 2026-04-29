"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  ChevronDown,
  Globe,
  Boxes,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sun,
  Webhook,
  MessageCircle,
  BookOpen,
  MessageSquare,
  CreditCard,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/api/rest/generic";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { getLocaleLabel, useI18n } from "@/i18n/client";
import { getActiveWorkspaceId, setActiveWorkspaceId, useCreateWorkspace, useWorkspaces } from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";
import { HubMailMarkThemedTile } from "@/components/brand/hubmail-mark";
import { WorkspaceSettingsDialog } from "@/components/workspace/workspace-settings-dialog";
import { WorkspaceMembersDialog } from "@/components/workspace/workspace-members-dialog";

const nav = [
  { href: "/dashboard", labelKey: "overview", icon: LayoutDashboard, exact: true },
  { href: "/inboxes", labelKey: "inboxes", icon: Inbox },
  { href: "/domains", labelKey: "domains", icon: Globe },
  { href: "/webhooks", labelKey: "webhooks", icon: Webhook },
  { href: "/agents", labelKey: "agents", icon: Bot },
  { href: "/api-keys", labelKey: "apiKeys", icon: KeyRound },
  { href: "/allow-block", labelKey: "allowBlock", icon: ListFilter },
  { href: "/metrics", labelKey: "metrics", icon: BarChart3 },
  { href: "/workspaces", labelKey: "workspaces", icon: Boxes },
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
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [addingWorkspace, setAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [workspaceMembersOpen, setWorkspaceMembersOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const { data: workspaces } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const qc = useQueryClient();
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | undefined>();
  const activeWorkspace =
    workspaces?.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces?.[0];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("hubmail.sidebar.collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("hubmail.sidebar.collapsed", next ? "1" : "0");
      } catch {}
      if (next) {
        setSettingsOpen(false);
        setWorkspaceMenuOpen(false);
      }
      return next;
    });
  }

  useEffect(() => {
    const cookieId = getActiveWorkspaceId();
    setActiveWorkspaceIdState(cookieId);

    // Se não há cookie e há workspaces, settar o primeiro (garante que o cookie é criado)
    if (!cookieId && workspaces?.length) {
      setActiveWorkspaceId(workspaces[0].id);
      setActiveWorkspaceIdState(workspaces[0].id);
    }
  }, [workspaces]);

  useEffect(() => {
    if (!settingsOpen && !workspaceMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const settingsNode = settingsMenuRef.current;
      const workspaceNode = workspaceMenuRef.current;
      if (settingsNode && !settingsNode.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
      if (workspaceNode && !workspaceNode.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
        setAddingWorkspace(false);
        setNewWorkspaceName("");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setWorkspaceMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen, workspaceMenuOpen]);

  function handleLocaleChange(nextLocale: AppLocale) {
    setLocale(nextLocale);
    router.refresh();
  }

  async function handleSignOut() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleWorkspaceSelect(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
    setActiveWorkspaceIdState(workspaceId);
    setWorkspaceMenuOpen(false);
    // Invalida todas as queries para que domínios, inboxes, webhooks, etc.
    // sejam recarregados com o novo workspace (o cookie já foi atualizado acima).
    qc.invalidateQueries();
    router.refresh();
  }

  async function handleAddWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;
    const workspace = await createWorkspace.mutateAsync({ name });
    setActiveWorkspaceId(workspace.id);
    setActiveWorkspaceIdState(workspace.id);
    setNewWorkspaceName("");
    setAddingWorkspace(false);
    setWorkspaceMenuOpen(false);
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const SidebarContent = () => (
    <>
      <div ref={workspaceMenuRef} className={cn(
        "relative flex h-14 items-center border-b border-neutral-200 dark:border-hub-border",
        collapsed ? "justify-center px-2" : "gap-2 px-4",
      )}>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/80 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200 lg:flex"
            aria-label={messages.sidebar.openNavigation}
            title={messages.sidebar.openNavigation}
          >
            <PanelLeftOpen className="size-4" aria-hidden />
          </button>
        ) : (
          <>
            <div className="flex size-8 items-center justify-center text-neutral-900 dark:text-white">
              <HubMailMarkThemedTile className="size-4" />
            </div>
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((open) => !open)}
              className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-200/80 dark:text-white dark:hover:bg-white/5"
              aria-expanded={workspaceMenuOpen}
              aria-haspopup="true"
            >
              <span className="truncate">{activeWorkspace?.name ?? "HubMail"}</span>
              <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/80 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200 lg:flex"
              aria-label={messages.sidebar.closeNavigation}
              title={messages.sidebar.closeNavigation}
            >
              <PanelLeftClose className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/80 dark:hover:bg-white/5 lg:hidden"
              aria-label={messages.sidebar.closeNavigation}
            >
              <X className="size-4" aria-hidden />
            </button>
          </>
        )}
        {workspaceMenuOpen ? (
          <div className="absolute left-12 right-4 top-12 z-50 rounded-md border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-hub-border dark:bg-hub-card">
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {workspaces?.map((workspace) => {
                const isCurrent = workspace.id === activeWorkspace?.id;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isCurrent
                        ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                        : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="truncate">{workspace.name}</span>
                    <span className="truncate text-[10px] opacity-70">{workspace.role}</span>
                  </button>
                );
              })}
            </div>
            {activeWorkspace && (
              <div className="mt-1 flex gap-1 border-t border-neutral-100 pt-1 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => { setWorkspaceMembersOpen(true); setWorkspaceMenuOpen(false); }}
                  className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  <Users className="size-3.5" aria-hidden />
                  Membros
                </button>
                <button
                  type="button"
                  onClick={() => { setWorkspaceSettingsOpen(true); setWorkspaceMenuOpen(false); }}
                  className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  <Settings className="size-3.5" aria-hidden />
                  Definições
                </button>
              </div>
            )}
            {addingWorkspace ? (
              <form onSubmit={handleAddWorkspace} className="mt-1 flex gap-1">
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Nome do workspace"
                  className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-hub-border dark:bg-hub-card dark:text-white dark:placeholder-neutral-500"
                  onKeyDown={(e) => { if (e.key === "Escape") { setAddingWorkspace(false); setNewWorkspaceName(""); } }}
                />
                <button
                  type="submit"
                  disabled={createWorkspace.isPending || !newWorkspaceName.trim()}
                  className="shrink-0 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {createWorkspace.isPending ? "..." : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingWorkspace(false); setNewWorkspaceName(""); }}
                  className="shrink-0 rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-hub-border dark:text-neutral-400 dark:hover:bg-white/5"
                >
                  <X className="size-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingWorkspace(true)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200/60 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
              >
                <Plus className="size-3.5" aria-hidden />
                Adicionar workspace
              </button>
            )}
          </div>
        ) : null}
      </div>

      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
        {nav.map(({ href, labelKey, icon: Icon, ...rest }) => {
          const exact = "exact" in rest ? (rest as { exact?: boolean }).exact : undefined;
          const active = isActive(href, exact);
          const label = messages.sidebar.nav[labelKey];
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                active
                  ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-80" aria-hidden />
              {collapsed ? null : label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-1 border-t border-neutral-200 dark:border-hub-border", collapsed ? "p-2" : "p-3")}>
        {collapsed ? null : (
          <>
            <Link
              href="/upgrade"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                isActive("/upgrade")
                  ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
              )}
            >
              <CreditCard className="size-3.5" aria-hidden />
              Upgrade
            </Link>
            <a
              href="https://hubmail.to"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              Discord
            </a>
            <a
              href="https://hubmail.to"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
            >
              <BookOpen className="size-3.5" aria-hidden />
              {messages.common.documentation}
            </a>
            <a
              href="https://hubmail.to"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5"
            >
              <MessageSquare className="size-3.5" aria-hidden />
              {messages.common.feedback}
            </a>
          </>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleSignOut}
              title={messages.common.signOut}
              aria-label={messages.common.signOut}
              className="flex size-8 items-center justify-center rounded-full bg-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-400/80 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            >
              {userLabel.slice(0, 1).toUpperCase()}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 dark:border-hub-border dark:bg-[#0a0a0a] lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 dark:border-transparent dark:bg-transparent dark:text-white">
            <HubMailMarkThemedTile className="size-4" />
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
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-neutral-200 bg-neutral-50 transition-[transform,width] lg:static lg:z-auto lg:translate-x-0",
          collapsed ? "lg:w-14" : "lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full max-lg:pointer-events-none",
          "dark:border-hub-border dark:bg-[#0a0a0a]",
        )}
      >
        <SidebarContent />
      </aside>

      {workspaceSettingsOpen && activeWorkspace && (
        <WorkspaceSettingsDialog
          workspace={activeWorkspace}
          onClose={() => setWorkspaceSettingsOpen(false)}
        />
      )}
      {workspaceMembersOpen && activeWorkspace && (
        <WorkspaceMembersDialog
          workspace={activeWorkspace}
          onClose={() => setWorkspaceMembersOpen(false)}
        />
      )}
    </>
  );
}
