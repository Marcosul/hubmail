"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Maximize2, Paperclip, Send, Shrink, X } from "lucide-react";
import { usePatchMessage, useSaveComposeDraft, useSendMail } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { useI18n } from "@/i18n/client";
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
  const send = useSendMail();
  const saveDraft = useSaveComposeDraft();
  const patchMessage = usePatchMessage();
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
  }, [
    initialDraft?.to,
    initialDraft?.cc,
    initialDraft?.subject,
    initialDraft?.text,
    initialDraft?.inReplyTo,
    initialDraftReferencesKey,
  ]);

  useEffect(() => {
    onHeadlineChange?.(subject);
  }, [subject, onHeadlineChange]);

  /** Auto-grava rascunho na pasta Drafts (JMAP) com debounce; rotações create+destroy ficam serializadas. */
  useEffect(() => {
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
    initialDraftReferencesKey,
    saveDraft,
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
    await draftSaveChainRef.current.catch(() => {});
    const draftIdToRemove = draftJmapIdRef.current;
    try {
      await send.mutateAsync({
        mailboxId,
        to: recipients,
        cc: splitAddresses(cc),
        subject: subject.trim() || messages.inboxes.noSubject,
        text: trimmedBody,
        inReplyTo: initialDraft?.inReplyTo,
        references: initialDraft?.references,
      });
      draftJmapIdRef.current = null;
      if (draftIdToRemove) {
        try {
          await patchMessage.mutateAsync({
            emailId: draftIdToRemove,
            mailboxId,
            patch: { delete: true },
          });
        } catch {
          /* JMAP notFound se o auto-save já rotacionou / apagou o rascunho */
        }
      }
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.sendError);
    }
  }

  const sending = send.isPending;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]",
        compact
          ? compactMaximized
            ? "min-h-0 flex-1 max-h-full"
            : "h-[min(580px,85dvh)] max-h-[90dvh] min-h-[280px]"
          : "min-h-[min(520px,75dvh)]",
        className,
      )}
      aria-label={copy.compose}
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
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={copy.minimize}
              onClick={onMinimize}
            >
              <ChevronDown className="size-4" />
            </button>
          ) : null}
          {onToggleMaximize ? (
            <button
              type="button"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label={maximized ? copy.restoreSize : copy.maximize}
              onClick={onToggleMaximize}
            >
              {maximized ? <Shrink className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
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
                onChange={(e) => setTo(e.target.value)}
                className={inputClass}
              />
              {!showCc ? (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
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
                onChange={(e) => setCc(e.target.value)}
                className={inputClass}
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
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
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
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? (compactMaximized ? 16 : 8) : 12}
            className={cn(
              "min-h-0 w-full min-w-0 flex-1 resize-y rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30 dark:focus:ring-white/20",
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
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          <Send className="size-3.5" />
          {sending ? copy.sending : copy.send}
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
