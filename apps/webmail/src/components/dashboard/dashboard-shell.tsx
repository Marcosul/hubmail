"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
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
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When set, replaces the default pathname-based breadcrumb. */
  breadcrumb?: React.ReactNode;
}) {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const out: { label: string; href?: string }[] = [{ label: "Dashboard", href: "/dashboard/overview" }];
    if (parts[0] === "dashboard" && parts[1]) {
      out.push({ label: titleCase(parts[1]), href: `/dashboard/${parts[1]}` });
      if (parts[2]) {
        out.push({ label: titleCase(parts[2]) });
      }
    }
    return out;
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0a0a0a]">
      <header className="border-b border-neutral-200 px-6 py-5 dark:border-hub-border lg:px-8">
        {breadcrumb ? (
          <div className="mb-2 text-xs text-neutral-500 dark:text-neutral-500">{breadcrumb}</div>
        ) : (
        <nav className="mb-2 text-xs text-neutral-500 dark:text-neutral-500" aria-label="Breadcrumb">
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
          <div>
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{title}</h1>
            )}
            {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className={cn("flex-1 overflow-auto px-6 py-6 lg:px-8")}>{children}</div>
    </div>
  );
}
