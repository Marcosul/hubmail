"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  ChevronDown,
  Download,
  Forward,
  Info,
  Mail,
  MoreHorizontal,
  Reply,
  ReplyAll,
  Trash2,
} from "lucide-react";
import type { EmailMessage, MailFolderSummary } from "@hubmail/types";
import { useMailFolders, usePatchMessage, useThread } from "@/hooks/use-mail";
import type { ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { getLocaleDateFormat, useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import type { AppMessages } from "@/i18n/messages";

type ThreadViewerProps = {
  mailboxId: string;
  threadId: string;
  mailboxAddress?: string;
  folderIdForBadge?: string;
  onDelete?: (emailId: string) => void | Promise<void>;
  onReply?: (draft: ComposeDraft) => void;
};

type ThreadViewerBodyProps = ThreadViewerProps & {
  locale: AppLocale;
  messages: AppMessages;
  threadQuery: ReturnType<typeof useThread>;
  folders: MailFolderSummary[] | undefined;
  patch: ReturnType<typeof usePatchMessage>;
};

function formatTimeShort(input: string | Date, locale: AppLocale) {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(getLocaleDateFormat(locale), {
    hour: "numeric",
    minute: "2-digit",
  });
}

function normRole(role: string) {
  return role.toLowerCase().replace(/^\/|\/$/g, "");
}

function resolveSpecialFolderId(
  folders: MailFolderSummary[] | undefined,
  kind: "trash" | "junk",
): string | undefined {
  if (!folders?.length) return undefined;
  for (const f of folders) {
    const r = normRole(f.role ?? "");
    const n = f.name.toLowerCase();
    if (kind === "trash") {
      if (r === "trash" || n.includes("trash") || n.includes("deleted")) return f.id;
    } else if (r === "junk" || r === "spam" || n.includes("junk") || n.includes("spam")) {
      return f.id;
    }
  }
  return undefined;
}

function isOutgoingHubmailMessage(message: EmailMessage) {
  return message.id.startsWith("outgoing-message:");
}

function firstToDisplay(message: EmailMessage) {
  const first = message.to[0];
  if (!first) return "";
  return (first.name || first.email.split("@")[0] || first.email).trim();
}

function safeFileBase(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 80) || "message";
}

function buildDownloadText(message: EmailMessage) {
  const lines = [
    `Subject: ${message.subject ?? ""}`,
    `From: ${message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email}`,
    `To: ${message.to.map((a) => a.email).join(", ")}`,
  ];
  if (message.cc?.length) lines.push(`Cc: ${message.cc.map((a) => a.email).join(", ")}`);
  if (message.bcc?.length) lines.push(`Bcc: ${message.bcc.map((a) => a.email).join(", ")}`);
  lines.push(
    `Date: ${typeof message.receivedAt === "string" ? message.receivedAt : message.receivedAt.toISOString()}`,
    "",
    message.bodyText ?? (message.bodyHtml ? message.bodyHtml.replace(/<[^>]+>/g, " ") : ""),
  );
  return lines.join("\n");
}

function buildReplyAllDraft(
  message: EmailMessage,
  selfEmail: string | undefined,
  noSubject: string,
  locale: AppLocale,
  composeQuoteOn: string,
  composeWrote: string,
): ComposeDraft {
  const self = selfEmail?.trim().toLowerCase();
  const fromAddr = message.from.email.toLowerCase();
  const others = new Set<string>();
  for (const a of message.to) {
    if (a.email.toLowerCase() !== self) others.add(a.email);
  }
  for (const a of message.cc ?? []) {
    if (a.email.toLowerCase() !== self) others.add(a.email);
  }
  others.delete(fromAddr);
  const rawSubject = message.subject ?? "";
  const subject = rawSubject.startsWith("Re:") ? rawSubject : rawSubject ? `Re: ${rawSubject}` : `Re: ${noSubject}`;
  const quoted = (message.bodyText ?? "")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return {
    to: message.from.email,
    cc: [...others].join(", "),
    subject,
    text: `\n\n${composeQuoteOn} ${new Date(message.receivedAt).toLocaleString(getLocaleDateFormat(locale))}, ${
      message.from.name || message.from.email
    } ${composeWrote}:\n${quoted}`,
    inReplyTo: message.inReplyTo ?? message.id,
    references: message.references,
  };
}

function buildForwardDraft(
  message: EmailMessage,
  noSubject: string,
  locale: AppLocale,
): ComposeDraft {
  const raw = message.subject ?? "";
  const subject = raw.toLowerCase().startsWith("fwd:") ? raw : raw ? `Fwd: ${raw}` : `Fwd: ${noSubject}`;
  const when = new Date(message.receivedAt).toLocaleString(getLocaleDateFormat(locale));
  const fromLine = message.from.name
    ? `${message.from.name} <${message.from.email}>`
    : message.from.email;
  const body = message.bodyText ?? (message.bodyHtml ? message.bodyHtml.replace(/<[^>]+>/g, " ") : "");
  const text = `\n\n---------- Forwarded message ----------\nFrom: ${fromLine}\nDate: ${when}\nSubject: ${
    message.subject ?? noSubject
  }\nTo: ${message.to.map((a) => a.email).join(", ")}\n\n${body}`;
  return { subject, text };
}

function avatarLetter(message: EmailMessage) {
  const s = (message.from.name || message.from.email || "?").trim();
  return s.charAt(0).toUpperCase() || "?";
}

type MessageHeaderCopy = {
  statusSent: string;
  statusDraft: string;
  moreActions: string;
  reply: string;
  replyAll: string;
  forward: string;
  moveToTrash: string;
  markUnreadFromHere: string;
  reportSpam: string;
  downloadMessage: string;
  manageLabels: string;
  messageInfo: string;
  toRecipients: string;
  showDetails: string;
  hideDetails: string;
  messageInfoTitle: string;
  messageInfoSubject: string;
  messageInfoFrom: string;
  messageInfoTo: string;
  messageInfoCc: string;
  messageInfoBcc: string;
  messageInfoDate: string;
  messageInfoMessageId: string;
  manageLabelsTitle: string;
  manageLabelsCurrent: string;
  manageLabelsAdd: string;
  manageLabelsPlaceholder: string;
  manageLabelsApply: string;
  manageLabelsHint: string;
  actionUnavailableSent: string;
  noSubject: string;
  noSender: string;
  noRecipient: string;
  dialogClose: string;
  dialogCancel: string;
};

function MessageCardHeader({
  message,
  mailboxId,
  copy,
  locale,
  composeCopy,
  mailboxAddress,
  trashFolderId,
  junkFolderId,
  threadId,
  folderIdForBadge,
  messagesInThread,
  patch,
  onDelete,
  onReply,
}: {
  message: EmailMessage;
  mailboxId: string;
  copy: MessageHeaderCopy;
  locale: AppLocale;
  composeCopy: { quoteOn: string; wrote: string };
  mailboxAddress: string | undefined;
  trashFolderId: string | undefined;
  junkFolderId: string | undefined;
  threadId: string;
  folderIdForBadge: string | undefined;
  messagesInThread: EmailMessage[];
  patch: ReturnType<typeof usePatchMessage>;
  onDelete?: (emailId: string) => void | Promise<void>;
  onReply?: (draft: ComposeDraft) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const outgoing = isOutgoingHubmailMessage(message);
  const subject = message.subject?.trim() ? message.subject : copy.noSubject;
  const statusBadge = message.flags.includes("$draft")
    ? copy.statusDraft
    : message.flags.includes("$sent")
      ? copy.statusSent
      : null;

  const toLineName = firstToDisplay(message);
  const toLine =
    toLineName.length > 0 ? copy.toRecipients.replace("{name}", toLineName) : copy.noRecipient;

  const fireReply = () => {
    const replyTo = message.from.email;
    const rawSubject = message.subject ?? "";
    const subj = rawSubject.startsWith("Re:") ? rawSubject : rawSubject ? `Re: ${rawSubject}` : `Re: ${copy.noSubject}`;
    const quoted = (message.bodyText ?? "")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    onReply?.({
      to: replyTo,
      subject: subj,
      text: `\n\n${composeCopy.quoteOn} ${new Date(message.receivedAt).toLocaleString(getLocaleDateFormat(locale))}, ${
        message.from.name || message.from.email
      } ${composeCopy.wrote}:\n${quoted}`,
      inReplyTo: message.inReplyTo ?? message.id,
      references: message.references,
    });
  };

  const fireReplyAll = () => {
    onReply?.(buildReplyAllDraft(message, mailboxAddress, copy.noSubject, locale, composeCopy.quoteOn, composeCopy.wrote));
  };

  const fireForward = () => {
    onReply?.(buildForwardDraft(message, copy.noSubject, locale));
  };

  const moveToTrash = async () => {
    setMenuOpen(false);
    /** `outgoing-message:*` não existe no JMAP — o API trata `moveToMailbox`/`delete` na tabela HubMail. */
    if (outgoing) {
      if (trashFolderId) {
        await patch.mutateAsync({
          emailId: message.id,
          mailboxId,
          threadId,
          patch: { moveToMailbox: trashFolderId },
        });
      } else {
        await patch.mutateAsync({
          emailId: message.id,
          mailboxId,
          threadId,
          patch: { delete: true },
        });
      }
      return;
    }
    if (trashFolderId) {
      await patch.mutateAsync({
        emailId: message.id,
        mailboxId,
        threadId,
        patch: { moveToMailbox: trashFolderId },
      });
      return;
    }
    await onDelete?.(message.id);
  };

  const reportSpam = async () => {
    setMenuOpen(false);
    if (outgoing) return;
    if (junkFolderId) {
      await patch.mutateAsync({
        emailId: message.id,
        mailboxId,
        threadId,
        patch: { moveToMailbox: junkFolderId },
      });
    } else {
      await patch.mutateAsync({
        emailId: message.id,
        mailboxId,
        threadId,
        patch: { labels: ["$junk"] },
      });
    }
  };

  const markUnreadFromHere = async () => {
    setMenuOpen(false);
    const idx = messagesInThread.findIndex((m) => m.id === message.id);
    const slice = idx >= 0 ? messagesInThread.slice(idx) : [message];
    for (const m of slice) {
      if (isOutgoingHubmailMessage(m)) continue;
      await patch.mutateAsync({
        emailId: m.id,
        mailboxId,
        threadId,
        folderIdForBadge,
        patch: { unread: true },
      });
    }
  };

  const downloadMessage = () => {
    setMenuOpen(false);
    const blob = new Blob([buildDownloadText(message)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileBase(subject)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyLabels = async () => {
    const parts = labelInput
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    await patch.mutateAsync({
      emailId: message.id,
      mailboxId,
      threadId,
      patch: { labels: parts },
    });
    setLabelInput("");
    setLabelsOpen(false);
  };

  type MenuRow = {
    key: string;
    icon: typeof Reply;
    label: string;
    onSelect: () => void | Promise<void>;
    disabled?: boolean;
  };

  const menuRows: MenuRow[] = [
    {
      key: "reply",
      icon: Reply,
      label: copy.reply,
      onSelect: () => {
        setMenuOpen(false);
        fireReply();
      },
    },
    {
      key: "replyAll",
      icon: ReplyAll,
      label: copy.replyAll,
      onSelect: () => {
        setMenuOpen(false);
        fireReplyAll();
      },
    },
    {
      key: "forward",
      icon: Forward,
      label: copy.forward,
      onSelect: () => {
        setMenuOpen(false);
        fireForward();
      },
    },
    {
      key: "trash",
      icon: Trash2,
      label: copy.moveToTrash,
      onSelect: () => moveToTrash(),
    },
    {
      key: "unread",
      icon: Mail,
      label: copy.markUnreadFromHere,
      onSelect: () => markUnreadFromHere(),
    },
    {
      key: "spam",
      icon: AlertCircle,
      label: copy.reportSpam,
      onSelect: () => reportSpam(),
      disabled: outgoing,
    },
    { key: "dl", icon: Download, label: copy.downloadMessage, onSelect: downloadMessage },
    {
      key: "labels",
      icon: Bookmark,
      label: copy.manageLabels,
      onSelect: () => {
        setMenuOpen(false);
        setLabelsOpen(true);
      },
      disabled: outgoing,
    },
    {
      key: "info",
      icon: Info,
      label: copy.messageInfo,
      onSelect: () => {
        setMenuOpen(false);
        setInfoOpen(true);
      },
    },
  ];

  const dateStr =
    typeof message.receivedAt === "string" ? message.receivedAt : message.receivedAt.toISOString();

  return (
    <div className="border-b border-neutral-200 pb-4 dark:border-hub-border">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-950 dark:text-white">
          {subject}
        </h3>
        {statusBadge ? (
          <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-400">
            {statusBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
            aria-hidden
          >
            {avatarLetter(message)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {message.from.name || message.from.email || copy.noSender}
              <span className="ml-1.5 font-normal text-neutral-500 dark:text-neutral-400">
                &lt;{message.from.email}&gt;
              </span>
            </p>
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="mt-0.5 flex items-center gap-1 text-left text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              aria-expanded={detailsOpen}
            >
              <span className="truncate">{toLine}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
              <span className="sr-only">{detailsOpen ? copy.hideDetails : copy.showDetails}</span>
            </button>
            {detailsOpen ? (
              <div className="mt-2 space-y-1 rounded-md border border-neutral-200 bg-white p-2 text-xs text-neutral-700 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300">
                <p>
                  <span className="font-medium text-neutral-500">{copy.messageInfoTo}:</span>{" "}
                  {message.to.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(", ") || "—"}
                </p>
                {message.cc?.length ? (
                  <p>
                    <span className="font-medium text-neutral-500">{copy.messageInfoCc}:</span>{" "}
                    {message.cc.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(", ")}
                  </p>
                ) : null}
                {message.bcc?.length ? (
                  <p>
                    <span className="font-medium text-neutral-500">{copy.messageInfoBcc}:</span>{" "}
                    {message.bcc.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:justify-end">
          <time className="text-xs text-neutral-500 dark:text-neutral-400" dateTime={dateStr}>
            {formatTimeShort(message.receivedAt, locale)}
          </time>
          <button
            type="button"
            onClick={() => fireReply()}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label={copy.reply}
          >
            <Reply className="size-4" aria-hidden />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={copy.moreActions}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-hub-border dark:bg-hub-card"
              >
                {menuRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      role="menuitem"
                      disabled={row.disabled}
                      title={row.disabled ? copy.actionUnavailableSent : undefined}
                      onClick={() => {
                        void row.onSelect();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-white/5"
                    >
                      <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
                      {row.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="msg-info-title"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-hub-border dark:bg-hub-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="msg-info-title" className="text-sm font-semibold text-neutral-900 dark:text-white">
              {copy.messageInfoTitle}
            </h4>
            <dl className="mt-3 space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
              <div>
                <dt className="font-medium text-neutral-500">{copy.messageInfoSubject}</dt>
                <dd className="break-words">{message.subject || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">{copy.messageInfoFrom}</dt>
                <dd className="break-words">
                  {message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">{copy.messageInfoTo}</dt>
                <dd className="break-words">{message.to.map((a) => a.email).join(", ") || "—"}</dd>
              </div>
              {message.cc?.length ? (
                <div>
                  <dt className="font-medium text-neutral-500">{copy.messageInfoCc}</dt>
                  <dd className="break-words">{message.cc.map((a) => a.email).join(", ")}</dd>
                </div>
              ) : null}
              {message.bcc?.length ? (
                <div>
                  <dt className="font-medium text-neutral-500">{copy.messageInfoBcc}</dt>
                  <dd className="break-words">{message.bcc.map((a) => a.email).join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-neutral-500">{copy.messageInfoDate}</dt>
                <dd>{new Date(message.receivedAt).toLocaleString(getLocaleDateFormat(locale))}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">{copy.messageInfoMessageId}</dt>
                <dd className="break-all font-mono text-[11px]">{message.id}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="mt-4 w-full rounded-md border border-neutral-200 py-2 text-sm font-medium dark:border-hub-border"
            >
              {copy.dialogClose}
            </button>
          </div>
        </div>
      ) : null}

      {labelsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setLabelsOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="labels-title"
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-hub-border dark:bg-hub-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="labels-title" className="text-sm font-semibold text-neutral-900 dark:text-white">
              {copy.manageLabelsTitle}
            </h4>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">{copy.manageLabelsCurrent}:</span>{" "}
              {message.labels.length ? message.labels.join(", ") : "—"}
            </p>
            <label className="mt-3 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {copy.manageLabelsAdd}
              <input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder={copy.manageLabelsPlaceholder}
                className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-2 text-sm dark:border-hub-border dark:bg-[#0f0f0f]"
              />
            </label>
            <p className="mt-2 text-xs text-neutral-500">{copy.manageLabelsHint}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void applyLabels()}
                className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                {copy.manageLabelsApply}
              </button>
              <button
                type="button"
                onClick={() => setLabelsOpen(false)}
                className="rounded-md border border-neutral-200 px-4 py-2 text-sm dark:border-hub-border"
              >
                {copy.dialogCancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Apresentação pura (sem hooks): evita violar a ordem de Hooks quando o pai
 * passa de `isPending` para dados — o React Query pode alterar hooks internos
 * entre estados; isolar `useMemo`/`return` aqui mantém o pai só com hooks estáveis.
 */
function ThreadViewerBody({
  mailboxId,
  threadId,
  mailboxAddress,
  folderIdForBadge,
  onDelete,
  onReply,
  locale,
  messages,
  threadQuery,
  folders,
  patch,
}: ThreadViewerBodyProps) {
  const copy = messages.inboxes;
  const composeCopy = messages.compose;
  const { data, isPending, isError, error, refetch } = threadQuery;

  if (isPending) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-500">{messages.common.loading}</p>;
  }
  if (isError || !data) {
    const detail = error instanceof Error ? error.message : "";
    return (
      <div className="flex max-w-md flex-col items-center gap-3 p-10 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">{copy.threadLoadError}</p>
        {detail ? (
          <p className="break-words text-xs text-neutral-500 dark:text-neutral-400" title={detail}>
            {detail}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium dark:border-hub-border"
        >
          {copy.refresh}
        </button>
      </div>
    );
  }

  const orderedMessages = !data.messages?.length
    ? []
    : [...data.messages].sort((a, b) => {
        const ta = new Date(a.receivedAt).getTime();
        const tb = new Date(b.receivedAt).getTime();
        return ta - tb;
      });

  const trashFolderId = resolveSpecialFolderId(folders, "trash");
  const junkFolderId = resolveSpecialFolderId(folders, "junk");

  const headerCopy: MessageHeaderCopy = {
    statusSent: copy.statusSent,
    statusDraft: copy.statusDraft,
    moreActions: copy.moreActions,
    reply: copy.reply,
    replyAll: copy.replyAll,
    forward: copy.forward,
    moveToTrash: copy.moveToTrash,
    markUnreadFromHere: copy.markUnreadFromHere,
    reportSpam: copy.reportSpam,
    downloadMessage: copy.downloadMessage,
    manageLabels: copy.manageLabels,
    messageInfo: copy.messageInfo,
    toRecipients: copy.toRecipients,
    showDetails: copy.showDetails,
    hideDetails: copy.hideDetails,
    messageInfoTitle: copy.messageInfoTitle,
    messageInfoSubject: copy.messageInfoSubject,
    messageInfoFrom: copy.messageInfoFrom,
    messageInfoTo: copy.messageInfoTo,
    messageInfoCc: copy.messageInfoCc,
    messageInfoBcc: copy.messageInfoBcc,
    messageInfoDate: copy.messageInfoDate,
    messageInfoMessageId: copy.messageInfoMessageId,
    manageLabelsTitle: copy.manageLabelsTitle,
    manageLabelsCurrent: copy.manageLabelsCurrent,
    manageLabelsAdd: copy.manageLabelsAdd,
    manageLabelsPlaceholder: copy.manageLabelsPlaceholder,
    manageLabelsApply: copy.manageLabelsApply,
    manageLabelsHint: copy.manageLabelsHint,
    actionUnavailableSent: copy.actionUnavailableSent,
    noSubject: copy.noSubject,
    noSender: copy.noSender,
    noRecipient: copy.noRecipient,
    dialogClose: messages.common.close,
    dialogCancel: messages.common.cancel,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4 sm:px-4">
        {orderedMessages.map((message) => (
          <article
            key={message.id}
            className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-hub-border dark:bg-[#0f0f0f] sm:p-4"
          >
            <MessageCardHeader
              message={message}
              mailboxId={mailboxId}
              copy={headerCopy}
              locale={locale}
              composeCopy={{ quoteOn: composeCopy.quoteOn, wrote: composeCopy.wrote }}
              mailboxAddress={mailboxAddress}
              trashFolderId={trashFolderId}
              junkFolderId={junkFolderId}
              threadId={threadId}
              folderIdForBadge={folderIdForBadge}
              messagesInThread={orderedMessages}
              patch={patch}
              onDelete={onDelete}
              onReply={onReply}
            />

            <div className="mt-4 text-sm text-neutral-800 dark:text-neutral-200">
              {message.bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none overflow-x-auto dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                />
              ) : message.bodyText ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                  {message.bodyText}
                </pre>
              ) : (
                <p className="text-neutral-500">{copy.noBody}</p>
              )}
            </div>

            {message.attachments.length > 0 ? (
              <footer className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3 dark:border-hub-border">
                {message.attachments.map((a) => (
                  <span
                    key={a.id ?? a.name}
                    className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs dark:border-hub-border dark:bg-hub-card"
                  >
                    <span className="font-medium">{a.name}</span>
                    <span className="text-neutral-500">{(a.size / 1024).toFixed(1)} KB</span>
                  </span>
                ))}
              </footer>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function ThreadViewerInner(props: ThreadViewerProps) {
  const { locale, messages } = useI18n();
  const threadQuery = useThread(props.mailboxId, props.threadId);
  const { data: folders } = useMailFolders(props.mailboxId);
  const patch = usePatchMessage();
  return (
    <ThreadViewerBody
      {...props}
      locale={locale}
      messages={messages}
      threadQuery={threadQuery}
      folders={folders}
      patch={patch}
    />
  );
}

export const ThreadViewer = memo(ThreadViewerInner);
