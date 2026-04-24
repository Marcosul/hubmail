"use client";

import { useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { useSendMail } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
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

export function EmailComposerCard({
  className,
  compact = false,
  onClose,
  mailboxId,
  initialDraft,
}: EmailComposerCardProps) {
  const [to, setTo] = useState(initialDraft?.to ?? "");
  const [cc, setCc] = useState(initialDraft?.cc ?? "");
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.text ?? "");
  const [showCc, setShowCc] = useState(Boolean(initialDraft?.cc));
  const [error, setError] = useState<string | null>(null);
  const send = useSendMail();

  async function handleSend() {
    setError(null);
    if (!mailboxId) {
      setError("Selecione uma mailbox antes de enviar.");
      return;
    }
    const recipients = splitAddresses(to);
    if (recipients.length === 0) {
      setError("Adicione pelo menos um destinatário.");
      return;
    }
    try {
      await send.mutateAsync({
        mailboxId,
        to: recipients,
        cc: splitAddresses(cc),
        subject: subject.trim() || "(sem assunto)",
        text: body,
        inReplyTo: initialDraft?.inReplyTo,
        references: initialDraft?.references,
      });
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar");
    }
  }

  const sending = send.isPending;

  return (
    <section
      className={cn(
        "flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]",
        className,
      )}
      aria-label="Compose email"
    >
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {initialDraft?.inReplyTo ? "Responder" : "New Message"}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
            aria-label="Close compose"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="space-y-2 border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <div className="flex items-center gap-2">
          <input
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-full rounded border border-transparent bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:focus:border-white/20"
          />
          {!showCc ? (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-[10px] font-medium uppercase text-neutral-500"
            >
              Cc
            </button>
          ) : null}
        </div>
        {showCc ? (
          <input
            placeholder="Cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="h-8 w-full rounded border border-transparent bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:focus:border-white/20"
          />
        ) : null}
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-8 w-full rounded border border-transparent bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:focus:border-white/20"
        />
      </div>

      <textarea
        placeholder="Write your message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={cn(
          "min-h-[120px] flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-400",
          compact && "min-h-[100px]",
        )}
      />

      {error ? (
        <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 dark:border-hub-border">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          <Send className="size-3.5" />
          {sending ? "A enviar…" : "Send"}
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
          aria-label="Attach file"
          title="Anexos em breve"
          disabled
        >
          <Paperclip className="size-4" />
        </button>
      </footer>
    </section>
  );
}
