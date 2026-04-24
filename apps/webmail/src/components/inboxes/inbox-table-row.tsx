"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { inboxFolderHref } from "@/lib/inbox-routes";

type InboxTableRowProps = {
  /** Encoded: same value as the inbox id cell (e.g. admin@hubmail.to) */
  inboxId: string;
  openFolder?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Clicks on the entire row go to the inbox mail view. Call `e.stopPropagation()` on actions.
 */
export function InboxTableRow({
  inboxId,
  openFolder = "sent",
  className,
  children,
}: InboxTableRowProps) {
  const router = useRouter();

  return (
    <tr
      className={cn("cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 dark:border-hub-border dark:hover:bg-white/5", className)}
      onClick={() => router.push(inboxFolderHref(inboxId, openFolder))}
    >
      {children}
    </tr>
  );
}
