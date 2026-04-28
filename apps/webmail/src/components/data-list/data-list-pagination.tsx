"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  /** Free-form summary on the left (e.g. "Página 1 de 5" or "12 contas"). */
  summary?: ReactNode;
  /** When provided, renders prev/next pagination on the right. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
};

export function DataListPagination({
  summary,
  page,
  totalPages,
  onPageChange,
  previousLabel = "Anterior",
  nextLabel = "Seguinte",
}: Props) {
  const showPager =
    typeof page === "number" && typeof totalPages === "number" && totalPages > 1 && onPageChange;
  return (
    <div className="flex flex-col items-stretch justify-between gap-2 text-sm text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center">
      <div className="min-w-0 truncate">{summary}</div>
      {showPager ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
          >
            <ChevronLeft className="size-3.5" />
            {previousLabel}
          </button>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200 dark:hover:bg-white/5"
          >
            {nextLabel}
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
