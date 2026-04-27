"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Maximize2, Paperclip, Send, Shrink, X } from "lucide-react";
import { useMailFolders, useSaveComposeDraft, useSendMail } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { useI18n } from "@/i18n/client";
import { inboxFolderHref, resolveSentFolderSlug } from "@/lib/inbox-routes";
import { cn } from "@/lib/utils";

type EmailComposerCardProps = {
  className?: string;
  compact?: boolean;
  /** Taller editor when dock is maximized (Gmail-style). */
  compactMaximized?: boolean;
  onClose?: () => void;
  mailboxId?: string;
  initialDraft?: ComposeDraft;
  /** Sync subject line to dock chrome (e.g. minimized tab title). */
  onHeadlineChange?: (subject: string) => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  maximized?: boolean;
};

function splitAddresses(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Só enviar In-Reply-To/References ao SMTP quando parecem Message-Id RFC (evita ids JMAP no cabeçalho). */
function isLikelyRfcMessageId(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v.startsWith("<") && v.includes("@") && v.endsWith(">");
}

function replyHeadersForSend(draft: ComposeDraft | undefined): {
  inReplyTo?: string;
  references?: string[];
} {
  const inReplyTo = draft?.inReplyTo?.trim();
  const irt = isLikelyRfcMessageId(inReplyTo) ? inReplyTo : undefined;
  const refs = draft?.references?.filter((r) => isLikelyRfcMessageId(r));
  return {
    inReplyTo: irt,
    references: refs?.length ? refs : undefined,
  };
}

const DRAFT_FLUSH_BEFORE_SEND_MS = 3500;
const SEND_SUCCESS_HOLD_MS = 2000;
/** Duração da animação de fecho (deve alinhar com `duration-*` no cartão). */
const COMPOSE_EXIT_MS = 320;

type SendButtonPhase = "idle" | "sending" | "sent";

const inputClass =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30 dark:focus:ring-white/20";

export function EmailComposerCard({
  className,
  compact = false,
  compactMaximized = false,
  onClose,
  mailboxId,
  initialDraft,
  onHeadlineChange,
  onMinimize,
  onToggleMaximize,
  maximized = false,
}: EmailComposerCardProps) {
  const uid = useId();
  const { messages } = useI18n();
  const copy = messages.compose;
  const fieldId = (name: string) => `${uid}-${name}`;
  const [to, setTo] = useState(initialDraft?.to ?? "");
  const [cc, setCc] = useState(initialDraft?.cc ?? "");
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.text ?? "");
  const [showCc, setShowCc] = useState(Boolean(initialDraft?.cc));
  const [error, setError] = useState<string | null>(null);
  const [sendButtonPhase, setSendButtonPhase] = useState<SendButtonPhase>("idle");
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const send = useSendMail();
  const saveDraft = useSaveComposeDraft();
  const { data: folders } = useMailFolders(mailboxId);
  const draftJmapIdRef = useRef<string | null>(null);
  const draftSaveChainRef = useRef(Promise.resolve());
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDraftReferencesKey =
    initialDraft?.references?.join(",") ?? "";

  /** Rascunho vindo do provider muda sem remontar o cartão (ex.: Responder depois de Escrever). */
  useEffect(() => {
    setTo(initialDraft?.to ?? "");
    setCc(initialDraft?.cc ?? "");
    setSubject(initialDraft?.subject ?? "");
    setBody(initialDraft?.text ?? "");
    setShowCc(Boolean(initialDraft?.cc));
    setError(null);
    setSendButtonPhase("idle");
    setIsExiting(false);
    draftJmapIdRef.current = initialDraft?.jmapDraftEmailId?.trim() || null;
  }, [
    initialDraft?.to,
    initialDraft?.cc,
    initialDraft?.subject,
    initialDraft?.text,
    initialDraft?.inReplyTo,
    initialDraft?.references,
    initialDraftReferencesKey,
    initialDraft?.jmapDraftEmailId,
  ]);

  useEffect(() => {
    onHeadlineChange?.(subject);
  }, [subject, onHeadlineChange]);

  /** Auto-grava rascunho na pasta Drafts (JMAP) com debounce; rotações create+destroy ficam serializadas. */
  useEffect(() => {
    if (sendButtonPhase !== "idle" || isExiting) {
      return;
    }
    if (!mailboxId) {
      draftJmapIdRef.current = null;
      return;
    }
    const hasContent =
      to.trim().length > 0 || subject.trim().length > 0 || body.trim().length > 0;
    if (!hasContent) {
      return;
    }

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      const snapshot = {
        mailboxId,
        to,
        cc,
        subject: subject.trim(),
        text: body,
        inReplyTo: initialDraft?.inReplyTo,
        references: initialDraft?.references,
      };
      draftSaveChainRef.current = draftSaveChainRef.current
        .catch(() => {})
        .then(async () => {
          try {
            const res = await saveDraft.mutateAsync({
              mailboxId: snapshot.mailboxId,
              replaceEmailId: draftJmapIdRef.current ?? undefined,
              to: splitAddresses(snapshot.to),
              cc: splitAddresses(snapshot.cc),
              subject: snapshot.subject,
              text: snapshot.text,
              inReplyTo: snapshot.inReplyTo,
              references: snapshot.references,
            });
            draftJmapIdRef.current = res.emailId;
          } catch {
            // falha JMAP / rede — não bloquear o utilizador
          }
        });
    }, 1200);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [
    mailboxId,
    to,
    cc,
    subject,
    body,
    initialDraft?.inReplyTo,
    initialDraft?.references,
    initialDraftReferencesKey,
    saveDraft,
    sendButtonPhase,
    isExiting,
  ]);

  async function handleSend() {
    setError(null);
    if (!mailboxId) {
      setError(copy.selectMailbox);
      return;
    }
    const recipients = splitAddresses(to);
    if (recipients.length === 0) {
      setError(copy.addRecipient);
      return;
    }
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError(copy.emptyBody);
      return;
    }
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    const replyHdr = replyHeadersForSend(initialDraft);
    flushSync(() => {
      setSendButtonPhase("sending");
    });
    try {
      await Promise.race([
        draftSaveChainRef.current.catch(() => {}),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, DRAFT_FLUSH_BEFORE_SEND_MS);
        }),
      ]);
      const draftIdToRemove = draftJmapIdRef.current;
      await send.mutateAsync({
        mailboxId,
        to: recipients,
        cc: splitAddresses(cc),
        subject: subject.trim() || messages.inboxes.noSubject,
        text: trimmedBody,
        inReplyTo: replyHdr.inReplyTo,
        references: replyHdr.references,
        draftEmailId: draftIdToRemove ?? undefined,
      });
      draftJmapIdRef.current = null;
      void queryClient.refetchQueries({ queryKey: ["mail-threads", mailboxId] });
      void queryClient.refetchQueries({ queryKey: ["mail-folders", mailboxId] });
      flushSync(() => {
        setSendButtonPhase("sent");
      });
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, SEND_SUCCESS_HOLD_MS);
      });
      setIsExiting(true);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, COMPOSE_EXIT_MS);
      });
      const sentSlug = resolveSentFolderSlug(folders);
      router.push(inboxFolderHref(mailboxId, sentSlug));
      onClose?.();
    } catch (err) {
      setSendButtonPhase("idle");
      setError(err instanceof Error ? err.message : copy.sendError);
    }
  }

  const sendButtonBusy = sendButtonPhase !== "idle";
  const composeLocked = sendButtonPhase === "sending" || sendButtonPhase === "sent";
  const chromeLocked = composeLocked || isExiting;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-[opacity,transform,filter] duration-300 ease-out motion-reduce:transition-none dark:border-hub-border dark:bg-[#0f0f0f]",
        compact
          ? compactMaximized
            ? "min-h-0 flex-1 max-h-full"
            : "h-[min(580px,85dvh)] max-h-[90dvh] min-h-[280px]"
          : "min-h-[min(520px,75dvh)]",
        isExiting &&
          "pointer-events-none translate-y-2 scale-[0.97] opacity-0 blur-[0.8px] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:blur-none",
        className,
      )}
      aria-label={copy.compose}
      aria-busy={composeLocked || undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {initialDraft?.inReplyTo ? copy.reply : copy.newMessage}
        </h2>
        <div className="flex items-center gap-0.5">
          {onMinimize ? (
            <button
              type="button"
              disabled={chromeLocked}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={copy.minimize}
              onClick={onMinimize}
            >
              <ChevronDown className="size-4" />
            </button>
          ) : null}
          {onToggleMaximize ? (
            <button
              type="button"
              disabled={chromeLocked}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={maximized ? copy.restoreSize : copy.maximize}
              onClick={onToggleMaximize}
            >
              {maximized ? <Shrink className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              disabled={chromeLocked}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={copy.close}
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 space-y-3 border-b border-neutral-200 px-3 py-3 dark:border-hub-border">
          <div>
            <label htmlFor={fieldId("to")} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {copy.to}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={fieldId("to")}
                type="email"
                autoComplete="email"
                placeholder="nome@dominio.com"
                value={to}
                disabled={composeLocked}
                onChange={(e) => setTo(e.target.value)}
                className={cn(inputClass, composeLocked && "cursor-not-allowed opacity-70")}
              />
              {!showCc ? (
                <button
                  type="button"
                  disabled={composeLocked}
                  onClick={() => setShowCc(true)}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800 disabled:pointer-events-none disabled:opacity-40 dark:hover:text-neutral-300"
                >
                  Cc
                </button>
              ) : null}
            </div>
          </div>
          {showCc ? (
            <div>
              <label htmlFor={fieldId("cc")} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Cc
              </label>
              <input
                id={fieldId("cc")}
                type="text"
                placeholder="opcional"
                value={cc}
                disabled={composeLocked}
                onChange={(e) => setCc(e.target.value)}
                className={cn(inputClass, composeLocked && "cursor-not-allowed opacity-70")}
              />
            </div>
          ) : null}
          <div>
            <label htmlFor={fieldId("subject")} className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {copy.subject}
            </label>
            <input
              id={fieldId("subject")}
              type="text"
              placeholder={copy.subject}
              value={subject}
              disabled={composeLocked}
              onChange={(e) => setSubject(e.target.value)}
              className={cn(inputClass, composeLocked && "cursor-not-allowed opacity-70")}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-1 pt-2">
          <label htmlFor={fieldId("body")} className="mb-1 block shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {copy.bodyLabel}
          </label>
          <textarea
            id={fieldId("body")}
            placeholder={copy.body}
            value={body}
            disabled={composeLocked}
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? (compactMaximized ? 16 : 8) : 12}
            className={cn(
              "min-h-0 w-full min-w-0 flex-1 resize-y rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30 dark:focus:ring-white/20",
              composeLocked && "cursor-not-allowed resize-none opacity-70",
              compact && !compactMaximized && "min-h-[140px]",
              compact && compactMaximized && "min-h-[min(320px,40dvh)]",
              !compact && "min-h-[200px]",
            )}
          />
        </div>
      </div>

      {error ? (
        <p className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <footer className="flex shrink-0 items-center justify-between border-t border-neutral-200 px-3 py-2 dark:border-hub-border">
        <button
          type="button"
          onClick={handleSend}
          disabled={sendButtonBusy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
            sendButtonPhase === "sent"
              ? "bg-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-100 dark:bg-emerald-500 dark:hover:bg-emerald-500"
              : "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
          )}
        >
          {sendButtonPhase === "sent" ? (
            <Check className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <Send className="size-3.5 shrink-0" aria-hidden />
          )}
          {sendButtonPhase === "sent"
            ? copy.sentButton
            : sendButtonPhase === "sending"
              ? copy.sendingButton
              : copy.send}
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
          aria-label={copy.attach}
          title={copy.attachmentsSoon}
          disabled
        >
          <Paperclip className="size-4" />
        </button>
      </footer>
    </section>
  );
}
