"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Adds a max-height + scroll on the body. */
  bodyClassName?: string;
};

/**
 * Standard list container used across hubmail (domains, inboxes, workspaces, …).
 * - Toolbar at the top (search / actions / badges)
 * - Body in the middle (table or ul)
 * - Footer at the bottom (pagination / counts)
 */
export function DataList({ toolbar, footer, children, className, bodyClassName }: Props) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border",
        className,
      )}
    >
      {toolbar ? (
        <div className="border-b border-neutral-200 bg-white p-3 dark:border-hub-border dark:bg-hub-card">
          {toolbar}
        </div>
      ) : null}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-hub-border dark:bg-[#141414]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
