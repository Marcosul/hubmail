"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Pencil } from "lucide-react";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type ComposeDraft = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  mailboxId?: string;
};

type ComposeCtx = {
  open: boolean;
  draft: ComposeDraft | null;
  setOpen: (v: boolean) => void;
  openCompose: (draft?: ComposeDraft) => void;
  closeCompose: () => void;
};

const Ctx = createContext<ComposeCtx | null>(null);

export function InboxComposeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const openCompose = useCallback((initial?: ComposeDraft) => {
    setDraft(initial ?? null);
    setOpen(true);
  }, []);
  const closeCompose = useCallback(() => {
    setOpen(false);
    setDraft(null);
  }, []);
  return (
    <Ctx.Provider value={{ open, draft, setOpen, openCompose, closeCompose }}>
      {children}
    </Ctx.Provider>
  );
}

export function useInboxCompose() {
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
  const { messages } = useI18n();
  return (
    <button
      type="button"
      onClick={() => openCompose()}
      className={cn(composeTriggerClass, className)}
    >
      <Pencil className="size-4" aria-hidden />
      {messages.compose.compose}
    </button>
  );
}

export function InboxComposeDock({ mailboxId }: { mailboxId?: string }) {
  const { open, draft, closeCompose } = useInboxCompose();
  const { messages } = useI18n();
  if (!open) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-black/30 dark:bg-black/50"
        aria-label={messages.compose.close}
        onClick={closeCompose}
      />
      <div
        className="fixed right-0 bottom-0 z-50 w-full p-3 sm:bottom-4 sm:right-4 sm:max-w-md sm:p-0"
        role="dialog"
        aria-label={messages.compose.dialog}
      >
        <EmailComposerCard
          onClose={closeCompose}
          className="max-h-[min(560px,78vh)] shadow-2xl"
          compact
          mailboxId={draft?.mailboxId ?? mailboxId}
          initialDraft={draft ?? undefined}
        />
      </div>
    </>
  );
}
