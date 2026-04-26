"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
import { ChevronUp, Pencil, X } from "lucide-react";
import { EmailComposerCard } from "@/components/inboxes/email-composer-card";
import { useMailboxes } from "@/hooks/use-mail";
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
  /** Id JMAP do rascunho existente (abrir da pasta Drafts — auto-save usa replace). */
  jmapDraftEmailId?: string;
};

export type ComposeDockWindowState = "normal" | "minimized" | "maximized";

type ComposeCtx = {
  open: boolean;
  draft: ComposeDraft | null;
  setOpen: (v: boolean) => void;
  openCompose: (draft?: ComposeDraft) => void;
  closeCompose: () => void;
  dockWindowState: ComposeDockWindowState;
  setDockWindowState: Dispatch<SetStateAction<ComposeDockWindowState>>;
  dockHeadline: string;
  setDockHeadline: (s: string) => void;
};

const Ctx = createContext<ComposeCtx | null>(null);

export function InboxComposeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [dockWindowState, setDockWindowState] = useState<ComposeDockWindowState>("normal");
  const [dockHeadline, setDockHeadline] = useState("");

  const openCompose = useCallback((initial?: ComposeDraft) => {
    setDraft(initial ?? null);
    setOpen(true);
    setDockWindowState("normal");
    setDockHeadline(initial?.subject?.trim() ?? "");
  }, []);

  const closeCompose = useCallback(() => {
    setOpen(false);
    setDraft(null);
    setDockWindowState("normal");
    setDockHeadline("");
  }, []);

  return (
    <Ctx.Provider
      value={{
        open,
        draft,
        setOpen,
        openCompose,
        closeCompose,
        dockWindowState,
        setDockWindowState,
        dockHeadline,
        setDockHeadline,
      }}
    >
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

function useMailboxIdForComposeRoute(): string | undefined {
  const pathname = usePathname();
  const { data: mailboxes } = useMailboxes();
  return useMemo(() => {
    const first = mailboxes?.[0]?.id;
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "dashboard" || parts[1] !== "inboxes") {
      return first;
    }
    const third = parts[2];
    if (!third) return first;
    const staticRoutes = new Set(["unified", "compose", "new", "smtp"]);
    if (staticRoutes.has(third)) return first;
    try {
      const rawId = decodeURIComponent(third);
      return mailboxes?.find((m) => m.id === rawId)?.id ?? first;
    } catch {
      return first;
    }
  }, [pathname, mailboxes]);
}

export function InboxComposeDockGlobal() {
  const routeMailboxId = useMailboxIdForComposeRoute();
  return <InboxComposeDock resolvedMailboxId={routeMailboxId} />;
}

type InboxComposeDockProps = {
  /** @deprecated Prefer InboxComposeDockGlobal; kept for inline use */
  mailboxId?: string;
  resolvedMailboxId?: string;
};

export function InboxComposeDock({ mailboxId, resolvedMailboxId }: InboxComposeDockProps) {
  const {
    open,
    draft,
    closeCompose,
    dockWindowState,
    setDockWindowState,
    dockHeadline,
    setDockHeadline,
  } = useInboxCompose();
  const { messages } = useI18n();
  const copy = messages.compose;

  const effectiveMailboxId = draft?.mailboxId ?? resolvedMailboxId ?? mailboxId;

  if (!open) {
    return null;
  }

  const isMinimized = dockWindowState === "minimized";
  const isMaximized = dockWindowState === "maximized";

  const titleForBar =
    dockHeadline.trim() ||
    (initialDraftTitle(draft) ?? (draft?.inReplyTo ? copy.reply : copy.newMessage));

  return (
    <div
      className={cn(
        "z-[100] flex flex-col pointer-events-none",
        isMaximized
          ? "fixed inset-x-0 bottom-0 top-14 p-2 sm:inset-4 sm:top-20 sm:p-0"
          : "fixed right-0 bottom-0 p-3 sm:bottom-4 sm:right-4 sm:p-0",
        !isMaximized && !isMinimized && "w-full sm:max-w-[min(100%,28rem)]",
        isMinimized && "w-full items-end sm:items-end p-2 sm:right-4 sm:bottom-4",
      )}
      aria-live="polite"
    >
      <div
        className={cn("pointer-events-auto", isMinimized ? "w-full max-w-md sm:max-w-sm" : "w-full")}
        role="dialog"
        aria-label={copy.dialog}
      >
        {isMinimized ? (
          <div className="flex overflow-hidden rounded-t-lg border border-b-0 border-neutral-200 bg-white shadow-2xl dark:border-hub-border dark:bg-[#0f0f0f] sm:rounded-lg sm:border-b">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-900 dark:text-neutral-100"
              onClick={() => setDockWindowState("normal")}
            >
              <ChevronUp className="size-4 shrink-0 text-neutral-500" aria-hidden />
              <span className="truncate font-medium">{titleForBar}</span>
            </button>
            <button
              type="button"
              className="shrink-0 rounded p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              aria-label={copy.close}
              onClick={closeCompose}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            !isMinimized ? "flex flex-col" : "hidden",
            isMaximized && "h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-6rem)]",
          )}
        >
          <EmailComposerCard
            key={draft?.jmapDraftEmailId ?? (draft?.inReplyTo ? String(draft.inReplyTo) : "compose")}
            onClose={closeCompose}
            className={cn("shadow-2xl", isMaximized && "h-full min-h-0")}
            compact
            compactMaximized={isMaximized}
            mailboxId={effectiveMailboxId}
            initialDraft={draft ?? undefined}
            onHeadlineChange={setDockHeadline}
            onMinimize={() => setDockWindowState("minimized")}
            onToggleMaximize={() => setDockWindowState((prev) => (prev === "maximized" ? "normal" : "maximized"))}
            maximized={isMaximized}
          />
        </div>
      </div>
    </div>
  );
}

function initialDraftTitle(d: ComposeDraft | null): string | undefined {
  const s = d?.subject?.trim();
  return s || undefined;
}
