"use client";

import { Star, Trash2, CornerUpLeft } from "lucide-react";
import { useThread } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { cn } from "@/lib/utils";

type ThreadViewerProps = {
  mailboxId: string;
  threadId: string;
  onDelete?: (emailId: string) => void | Promise<void>;
  onToggleStar?: (emailId: string, starred: boolean) => void | Promise<void>;
  onToggleUnread?: (emailId: string, unread: boolean) => void | Promise<void>;
  onReply?: (draft: ComposeDraft) => void;
};

function formatDate(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function ThreadViewer({
  mailboxId,
  threadId,
  onDelete,
  onToggleStar,
  onToggleUnread,
  onReply,
}: ThreadViewerProps) {
  const { data, isLoading, isError, refetch } = useThread(mailboxId, threadId);

  if (isLoading) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-500">A carregar thread…</p>;
  }
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-neutral-500">
        Falha ao carregar a thread.
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium dark:border-hub-border"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const subject = data.messages[0]?.subject ?? "(sem assunto)";
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-hub-border">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-neutral-950 dark:text-white">
            {subject}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {data.messages.length} mensagem{data.messages.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {data.messages.map((message) => {
          const starred = message.flags.includes("$flagged");
          const unread = !message.flags.includes("$seen");
          return (
            <article
              key={message.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 dark:border-hub-border dark:bg-[#0f0f0f]"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {message.from.name || message.from.email || "(sem remetente)"}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {message.from.email} →{" "}
                    {message.to.map((a) => a.email).join(", ") || "(sem destinatário)"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                  <span>{formatDate(message.receivedAt)}</span>
                  <button
                    type="button"
                    onClick={() => onToggleStar?.(message.id, !starred)}
                    className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-white/10"
                    aria-label="Toggle star"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        starred ? "fill-yellow-400 text-yellow-500" : "text-neutral-400",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleUnread?.(message.id, !unread)}
                    className="rounded px-1.5 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                  >
                    {unread ? "Marcar lido" : "Marcar não lido"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const replyTo = message.from.email;
                      const subject = message.subject.startsWith("Re:")
                        ? message.subject
                        : `Re: ${message.subject}`;
                      const quoted =
                        (message.bodyText ?? "")
                          .split("\n")
                          .map((line) => `> ${line}`)
                          .join("\n");
                      onReply?.({
                        to: replyTo,
                        subject,
                        text: `\n\nEm ${new Date(message.receivedAt).toLocaleString()}, ${
                          message.from.name || message.from.email
                        } escreveu:\n${quoted}`,
                        inReplyTo: message.inReplyTo ?? message.id,
                        references: message.references,
                      });
                    }}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                    aria-label="Reply"
                  >
                    <CornerUpLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(message.id)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </header>

              <div className="mt-3 text-sm text-neutral-800 dark:text-neutral-200">
                {message.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : message.bodyText ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                    {message.bodyText}
                  </pre>
                ) : (
                  <p className="text-neutral-500">(sem corpo)</p>
                )}
              </div>

              {message.attachments.length > 0 ? (
                <footer className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3 dark:border-hub-border">
                  {message.attachments.map((a) => (
                    <span
                      key={a.id ?? a.name}
                      className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-hub-border dark:bg-hub-card"
                    >
                      <span className="font-medium">{a.name}</span>
                      <span className="text-neutral-500">
                        {(a.size / 1024).toFixed(1)} KB
                      </span>
                    </span>
                  ))}
                </footer>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
