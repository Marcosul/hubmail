"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Pencil } from "lucide-react";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { cn } from "@/lib/utils";

type ComposeCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openCompose: () => void;
  closeCompose: () => void;
};

const Ctx = createContext<ComposeCtx | null>(null);

export function InboxComposeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCompose = useCallback(() => setOpen(true), []);
  const closeCompose = useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ open, setOpen, openCompose, closeCompose }}>{children}</Ctx.Provider>
  );
}

function useInboxCompose() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("Inbox compose controls must be used within InboxComposeProvider");
  }
  return v;
}

const composeTriggerClass =
  "flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900";

export function InboxComposeTrigger({ className }: { className?: string }) {
  const { openCompose } = useInboxCompose();
  return (
    <button type="button" onClick={openCompose} className={cn(composeTriggerClass, className)}>
      <Pencil className="size-4" aria-hidden />
      Compose
    </button>
  );
}

/**
 * Fixed dock (estilo janela no canto); só visível com compose aberto.
 */
export function InboxComposeDock() {
  const { open, closeCompose } = useInboxCompose();
  if (!open) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-black/30 dark:bg-black/50"
        aria-label="Close compose"
        onClick={closeCompose}
      />
      <div
        className="fixed right-0 bottom-0 z-50 w-full p-3 sm:bottom-4 sm:right-4 sm:max-w-md sm:p-0"
        role="dialog"
        aria-label="New message"
      >
        <EmailComposerCard
          onClose={closeCompose}
          className="max-h-[min(560px,78vh)] shadow-2xl"
          compact
        />
      </div>
    </>
  );
}
