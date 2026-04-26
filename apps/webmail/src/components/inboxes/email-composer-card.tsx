"use client";

import { useEffect, useId, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { useSendMail } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

type EmailComposerCardProps = {
  className?: string;
  compact?: boolean;
  onClose?: () => void;
  mailboxId?: string;
  initialDraft?: ComposeDraft;
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
  onClose,
  mailboxId,
  initialDraft,
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
          ? "h-[min(580px,85dvh)] max-h-[90dvh] min-h-[280px]"
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
        <div className="flex items-center gap-1">
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
            rows={compact ? 8 : 12}
            className={cn(
              "min-h-0 w-full min-w-0 flex-1 resize-y rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 dark:border-hub-border dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30 dark:focus:ring-white/20",
              compact ? "min-h-[140px]" : "min-h-[200px]",
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
