"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useAddMailboxSavedLabels } from "@/hooks/use-mailbox-saved-labels";

type Copy = {
  labelsOpenAdd: string;
  labelsSubmitAdd: string;
  labelsPlaceholder: string;
  labelsCommaHelp: string;
};

export function InboxSavedLabelsPopover({
  mailboxId,
  disabled,
  copy,
}: {
  mailboxId: string | undefined;
  disabled?: boolean;
  copy: Copy;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const add = useAddMailboxSavedLabels(mailboxId);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function submit() {
    if (!mailboxId || !raw.trim()) return;
    try {
      await add.mutateAsync(raw);
      setRaw("");
      setOpen(false);
    } catch {
      /* toast optional */
    }
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || !mailboxId}
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md border border-dashed border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.labelsOpenAdd}
      >
        <Plus className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={copy.labelsOpenAdd}
          className="absolute left-0 top-full z-[70] mt-1 w-[min(100vw-1.5rem,18rem)] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-hub-border dark:bg-hub-card"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={copy.labelsPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/30 dark:border-hub-border dark:bg-[#0f0f0f] dark:text-white"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={add.isPending || !raw.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              aria-label={copy.labelsSubmitAdd}
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{copy.labelsCommaHelp}</p>
        </div>
      ) : null}
    </div>
  );
}
