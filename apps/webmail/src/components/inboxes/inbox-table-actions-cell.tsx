"use client";

import type { ReactNode } from "react";

export function InboxTableActionsCell({ children }: { children: ReactNode }) {
  return (
    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
      {children}
    </td>
  );
}
