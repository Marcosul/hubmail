"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Optional input event handler (e.g. submit on Enter). */
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Rendered to the left of the search input (e.g. plan-info badge). */
  badge?: ReactNode;
  /** Rendered to the right of the search input (primary CTA, etc.). */
  actions?: ReactNode;
  /** Optional helper / hint / error text rendered below the row. */
  hint?: ReactNode;
  className?: string;
};

export function DataListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onSearchKeyDown,
  badge,
  actions,
  hint,
  className,
}: Props) {
  const hasSearch = onSearchChange !== undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {badge ? <div className="flex shrink-0 items-center gap-2">{badge}</div> : null}
        {hasSearch ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-hub-border dark:bg-[#141414] dark:text-white dark:focus:border-white"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {hint ? <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{hint}</div> : null}
    </div>
  );
}
