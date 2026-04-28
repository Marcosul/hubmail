"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashboardShell({
  children,
  title,
  subtitle,
  actions,
  breadcrumb,
  contentClassName,
  headerClassName,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When set, replaces the default pathname-based breadcrumb. */
  breadcrumb?: React.ReactNode;
  /** Merged into the main content wrapper (below header). */
  contentClassName?: string;
  /** Merged into the page header (breadcrumb / title row). */
  headerClassName?: string;
}) {
  const pathname = usePathname();
  const { messages } = useI18n();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs = messages.dashboard.breadcrumbs;
    const out: { label: string; href?: string }[] = [{ label: messages.dashboard.dashboard, href: "/dashboard" }];
    if (parts[0] && parts[0] !== "dashboard") {
      out.push({
        label: breadcrumbs[parts[0] as keyof typeof breadcrumbs] ?? titleCase(parts[0]),
        href: `/${parts[0]}`,
      });
      if (parts[1]) {
        out.push({
          label: breadcrumbs[parts[1] as keyof typeof breadcrumbs] ?? titleCase(parts[1]),
          href: parts[2] ? `/${parts[0]}/${parts[1]}` : undefined,
        });
      }
      if (parts[2]) {
        out.push({ label: breadcrumbs[parts[2] as keyof typeof breadcrumbs] ?? titleCase(parts[2]) });
      }
    }
    return out;
  }, [messages, pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0a0a0a]">
      <header
        className={cn(
          "border-b border-neutral-200 px-4 py-4 dark:border-hub-border sm:px-6 sm:py-5 lg:px-8",
          headerClassName,
        )}
      >
        {breadcrumb ? (
          <div className="mb-2 text-sm text-neutral-500 dark:text-neutral-500">{breadcrumb}</div>
        ) : (
        <nav className="mb-2 text-sm text-neutral-500 dark:text-neutral-500" aria-label={messages.common.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-neutral-400">/</span>}
                {c.href ? (
                  <a href={c.href} className="hover:text-neutral-800 dark:hover:text-neutral-300">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-neutral-600 dark:text-neutral-400">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-950 dark:text-white sm:text-2xl">{title}</h1>
            )}
            {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
        </div>
      </header>
      <div className={cn("flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8", contentClassName)}>{children}</div>
    </div>
  );
}
