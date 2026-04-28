"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmailMessage, MailboxSummary, MailFolderSummary, ThreadSummary } from "@hubmail/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Copy,
  FilePenLine,
  Flag,
  Inbox,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InboxComposeTrigger, useInboxCompose, type ComposeDraft } from "@/components/inboxes/inbox-compose-provider";
import { InboxThreadListColumn } from "@/components/inboxes/inbox-thread-list-column";
import { ThreadViewer } from "@/components/inboxes/thread-viewer";
import { useMailFolders, useMailboxes, usePatchMessage, useThread, useThreads } from "@/hooks/use-mail";
import { useMailStream } from "@/hooks/use-mail-stream";
import { useI18n } from "@/i18n/client";
import type { AppLocale } from "@/i18n/config";
import { getFolderLabel, inboxFolderHref } from "@/lib/inbox-routes";
import { cn } from "@/lib/utils";

type InboxMailViewProps = {
  inboxId: string;
  folderSlug: string;
};

function matchFolderBySlug(folders: ReturnType<typeof useMailFolders>["data"], slug: string) {
  if (!folders) return undefined;
  const slugNormalized = slug.replace(/-/g, "");
  return (
    folders.find((f) => (f.role ?? "").toLowerCase() === slugNormalized) ||
    folders.find((f) => f.name.toLowerCase() === slug.replace(/-/g, " "))
  );
}

/** Ícone por papel JMAP ou nome típico do servidor (Sent Items, Junk Mail, …). */
function folderNavIcon(folder: MailFolderSummary): LucideIcon {
  const role = (folder.role ?? "").toLowerCase().replace(/^\/|\/$/g, "");
  const name = folder.name.toLowerCase();

  if (role === "inbox" || name.includes("inbox")) return Inbox;
  if (role === "sent" || name.includes("sent")) return Send;
  if (role === "drafts" || name.includes("draft")) return FilePenLine;
  if (role === "trash" || name.includes("trash") || name.includes("deleted")) return Trash2;
  if (role === "junk" || name.includes("junk") || name.includes("spam")) return AlertCircle;
  if (role === "archive" || name.includes("archive")) return Archive;
  if (role === "important" || name.includes("important")) return Flag;
  if (name.includes("scheduled")) return Clock;
  if (name.includes("starred")) return Star;
  if (name.includes("all mail") || name === "all") return Mail;
  return Mail;
}

function isDraftsNavFolder(folder: MailFolderSummary): boolean {
  const role = (folder.role ?? "").toLowerCase().replace(/^\/|\/$/g, "");
  if (role === "drafts" || role === "draft") return true;
  return folder.name.toLowerCase().includes("draft");
}

function joinMailAddresses(list: { email: string }[] | undefined): string {
  if (!list?.length) return "";
  return list
    .map((a) => a.email.trim())
    .filter(Boolean)
    .join(", ");
}

function bodyTextFromEmailMessage(m: EmailMessage): string {
  const t = m.bodyText?.trim();
  if (t) return t;
  if (m.bodyHtml) {
    return m.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function draftMessageToComposeDraft(message: EmailMessage, mailboxId: string): ComposeDraft {
  return {
    mailboxId,
    jmapDraftEmailId: message.id,
    to: joinMailAddresses(message.to),
    cc: message.cc?.length ? joinMailAddresses(message.cc) : undefined,
    bcc: message.bcc?.length ? joinMailAddresses(message.bcc) : undefined,
    subject: message.subject?.trim() ? message.subject : undefined,
    text: bodyTextFromEmailMessage(message),
    html: message.bodyHtml ?? undefined,
    inReplyTo: message.inReplyTo,
    references: message.references,
  };
}

/** Pastas normais: não lidos. Rascunhos: total na pasta (são guardados como lidos). */
function sidebarFolderBadge(
  folder: MailFolderSummary,
  activeFolderId: string | undefined,
  listUnreadHint: number | null,
  listTotalHint: number | null,
): number {
  if (isDraftsNavFolder(folder)) {
    const fromServer = folder.totalEmails ?? 0;
    if (folder.id === activeFolderId && listTotalHint != null) {
      return Math.max(fromServer, listTotalHint);
    }
    return fromServer;
  }
  if (folder.id !== activeFolderId || listUnreadHint === null) {
    return folder.unreadEmails;
  }
  return Math.max(folder.unreadEmails, listUnreadHint);
}

function BreadcrumbGt() {
  return <span className="shrink-0 text-neutral-300 dark:text-neutral-600">&gt;</span>;
}

function CopyMailboxAddressButton({ address, label }: { address: string | undefined; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  return (
    <button
      type="button"
      className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
    >
      <Copy className={cn("size-3.5", copied && "text-emerald-600 dark:text-emerald-400")} aria-hidden />
    </button>
  );
}

function MailboxBreadcrumbSwitcher({
  mailboxes,
  currentId,
  folderSlug,
  currentAddress,
  switchMailboxLabel,
  copyAddressLabel,
}: {
  mailboxes: MailboxSummary[] | undefined;
  currentId: string;
  folderSlug: string;
  currentAddress: string | undefined;
  switchMailboxLabel: string;
  copyAddressLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const sorted = useMemo(
    () => [...(mailboxes ?? [])].sort((a, b) => a.address.localeCompare(b.address)),
    [mailboxes],
  );
  const canSwitch = sorted.length > 1;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!canSwitch) {
    return (
      <span className="inline-flex min-w-0 max-w-[min(100%,18rem)] items-center gap-0.5 sm:max-w-[22rem]">
        <span
          className="min-w-0 truncate font-medium text-neutral-700 dark:text-neutral-300"
          title={currentAddress}
        >
          {currentAddress ?? "…"}
        </span>
        <CopyMailboxAddressButton address={currentAddress} label={copyAddressLabel} />
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-flex min-w-0 max-w-[min(100%,18rem)] items-center gap-0.5 sm:max-w-[22rem]"
    >
      <button
        type="button"
        id="mailbox-breadcrumb-switcher-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? "mailbox-breadcrumb-switcher-list" : undefined}
        aria-label={switchMailboxLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 max-w-full items-center gap-0.5 rounded-md px-1 py-0.5 text-left font-medium text-neutral-700 outline-none ring-neutral-400/40 hover:bg-neutral-100 focus-visible:ring-2 dark:text-neutral-300 dark:hover:bg-white/10 dark:ring-white/30"
      >
        <span className="min-w-0 truncate" title={currentAddress}>
          {currentAddress ?? "…"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 opacity-70 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <CopyMailboxAddressButton address={currentAddress} label={copyAddressLabel} />
      {open ? (
        <ul
          id="mailbox-breadcrumb-switcher-list"
          role="listbox"
          aria-labelledby="mailbox-breadcrumb-switcher-trigger"
          className="absolute left-0 top-full z-[60] mt-1 max-h-60 min-w-[12rem] max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-hub-border dark:bg-hub-card"
        >
          {sorted.map((m) => (
            <li key={m.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={m.id === currentId}
                className={cn(
                  "flex w-full items-center truncate px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/10",
                  m.id === currentId && "bg-neutral-100 font-medium dark:bg-white/5",
                )}
                onClick={() => {
                  setOpen(false);
                  router.push(inboxFolderHref(m.id, folderSlug));
                }}
              >
                {m.address}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ─── ThreadViewerPanel ────────────────────────────────────────────────────────
// memo() garante que o leitor de thread nao re-renderiza quando a lista de
// threads atualiza via SSE - apenas quando threadId ou mailboxId mudam.

type ThreadViewerPanelProps = {
  mailboxId: string | undefined;
  mailboxAddress: string | undefined;
  folderIdForBadge: string | undefined;
  threadId: string;
  onDelete: (emailId: string) => Promise<void>;
  onReply: (draft: ComposeDraft) => void;
  selectConversationLabel: string;
};

const ThreadViewerPanel = memo(function ThreadViewerPanel({
  mailboxId,
  mailboxAddress,
  folderIdForBadge,
  threadId,
  onDelete,
  onReply,
  selectConversationLabel,
}: ThreadViewerPanelProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]">
      {threadId && mailboxId ? (
        <ThreadViewer
          mailboxId={mailboxId}
          threadId={threadId}
          mailboxAddress={mailboxAddress}
          folderIdForBadge={folderIdForBadge}
          onDelete={onDelete}
          onReply={onReply}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-12 text-sm text-neutral-500">
          {selectConversationLabel}
        </div>
      )}
    </section>
  );
});

// ─── ThreadListSection ────────────────────────────────────────────────────────
// Possui o useThreads e todo o estado de busca/paginacao. Quando o SSE dispara
// refetchQueries(["mail-threads"]), apenas esta secao re-renderiza.
// O viewerSlot e passado como prop e nao e afetado pelo re-render da lista.

type ThreadListCopy = {
  refresh: string;
  labelsToolbar: string;
  labelsAdd: string;
  labels: string;
  include: string;
  includeAll: string;
  includeUnread: string;
  threadsPerPage: string;
  pagerFirst: string;
  pagerPrev: string;
  pagerNext: string;
  pagerLast: string;
  searchPlaceholder: string;
  clearSearch: string;
  sync: string;
  searchNoResults: string;
  noMessagesInFolder: string;
  noSender: string;
};

type ThreadListSectionProps = {
  mailboxId: string | undefined;
  folderId: string | undefined;
  folderSlug: string;
  locale: AppLocale;
  selectedThreadId: string;
  onSelectThread: (thread: ThreadSummary) => void;
  onCompose: () => void;
  viewerSlot: React.ReactNode;
  copy: ThreadListCopy;
  /** Contagem de não lidos na página atual (lista) para alinhar badge da pasta ativa. */
  onFolderUnreadHint?: (count: number | null) => void;
  /** Pasta Drafts: total de threads na lista para alinhar badge com JMAP atrasado. */
  draftTotalHint?: boolean;
  onFolderTotalHint?: (count: number | null) => void;
};

function ThreadListSection({
  mailboxId,
  folderId,
  folderSlug,
  locale,
  selectedThreadId,
  onSelectThread,
  onCompose,
  viewerSlot,
  copy,
  onFolderUnreadHint,
  draftTotalHint = false,
  onFolderTotalHint,
}: ThreadListSectionProps) {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true, shallow: true }),
  );

  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const [threadLimit, setThreadLimit] = useState(30);
  const [threadCursor, setThreadCursor] = useState(0);
  const [includeMode, setIncludeMode] = useState<"all" | "unread">("all");

  useEffect(() => {
    setThreadCursor(0);
  }, [folderId, mailboxId, debouncedSearch, threadLimit]);

  const threadsQuery = useThreads(mailboxId, {
    folderId,
    limit: threadLimit,
    cursor: threadCursor,
    search: debouncedSearch || undefined,
  });

  const pageData = threadsQuery.data;
  const totalThreads = pageData?.total;
  const pageLen = pageData?.threads.length ?? 0;
  const rangeFrom = totalThreads === 0 || pageLen === 0 ? 0 : threadCursor + 1;
  const rangeTo = threadCursor + pageLen;
  const hasPrevPage = threadCursor > 0;
  const hasNextPage = Boolean(pageData?.nextCursor);
  const lastPageCursor =
    totalThreads != null && threadLimit > 0
      ? Math.max(0, Math.floor((totalThreads - 1) / threadLimit) * threadLimit)
      : 0;

  const pagerRangeLabel =
    locale === "en-US"
      ? `${rangeFrom} to ${rangeTo} of ${totalThreads ?? "—"}`
      : `${rangeFrom} a ${rangeTo} de ${totalThreads ?? "—"}`;

  const labelPill = folderSlug.replace(/-/g, " ") || "inbox";

  const unreadHintEnabled = includeMode === "all" && !debouncedSearch.trim();

  const refetch = useCallback(() => {
    if (!mailboxId) return;
    void queryClient.refetchQueries({ queryKey: ["mail-threads", mailboxId], type: "active" });
    void queryClient.refetchQueries({ queryKey: ["mail-folders", mailboxId], type: "active" });
  }, [mailboxId, queryClient]);

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 border-b border-neutral-200 pb-3 dark:border-hub-border sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300 dark:hover:bg-white/5"
            aria-label={copy.refresh}
          >
            <RefreshCw className="size-4" />
          </button>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{copy.labelsToolbar}</span>
          <button
            type="button"
            onClick={onCompose}
            className="flex size-8 items-center justify-center rounded-md border border-dashed border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-white/5"
            aria-label={copy.labelsAdd}
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-700 dark:border-hub-border dark:bg-white/5 dark:text-neutral-200">
            {labelPill}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="whitespace-nowrap">{copy.include}</span>
            <select
              value={includeMode}
              onChange={(e) => setIncludeMode(e.target.value as "all" | "unread")}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white"
            >
              <option value="all">{copy.includeAll}</option>
              <option value="unread">{copy.includeUnread}</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="whitespace-nowrap">{copy.threadsPerPage}</span>
            <select
              value={threadLimit}
              onChange={(e) => setThreadLimit(Number(e.target.value))}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-hub-border dark:bg-hub-card dark:text-white"
            >
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={!hasPrevPage}
              onClick={() => setThreadCursor(0)}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300 dark:hover:bg-white/5"
              aria-label={copy.pagerFirst}
            >
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={!hasPrevPage}
              onClick={() => setThreadCursor((c) => Math.max(0, c - threadLimit))}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300 dark:hover:bg-white/5"
              aria-label={copy.pagerPrev}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[7.5rem] px-1 text-center text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {threadsQuery.isPending ? "…" : pagerRangeLabel}
            </span>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => {
                const n = pageData?.nextCursor;
                if (n == null) return;
                setThreadCursor(Number(n));
              }}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300 dark:hover:bg-white/5"
              aria-label={copy.pagerNext}
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              disabled={totalThreads == null || threadCursor >= lastPageCursor}
              onClick={() => setThreadCursor(lastPageCursor)}
              className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-hub-border dark:bg-hub-card dark:text-neutral-300 dark:hover:bg-white/5"
              aria-label={copy.pagerLast}
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-hub-border dark:bg-[#0f0f0f]">
        <Search className="size-3.5 shrink-0 text-neutral-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => void setSearchInput(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => void setSearchInput("")}
            className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            aria-label={copy.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <InboxThreadListColumn
          mailboxId={mailboxId}
          folderId={folderId}
          search={debouncedSearch || undefined}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          locale={locale}
          limit={threadLimit}
          cursor={threadCursor}
          hideSummaryRow
          clientFilter={includeMode}
          unreadHintEnabled={unreadHintEnabled}
          onUnreadInViewChange={onFolderUnreadHint}
          totalHintEnabled={unreadHintEnabled && draftTotalHint}
          onFolderTotalHintChange={onFolderTotalHint}
          copy={{
            sync: copy.sync,
            searchNoResults: copy.searchNoResults,
            noMessagesInFolder: copy.noMessagesInFolder,
            noSender: copy.noSender,
          }}
        />
        {viewerSlot}
      </div>
    </>
  );
}

// ─── InboxMailView (exported) ─────────────────────────────────────────────────

export function InboxMailView({ inboxId, folderSlug }: InboxMailViewProps) {
  return <Content inboxId={inboxId} folderSlug={folderSlug} />;
}

// ─── Content (orchestrator) ───────────────────────────────────────────────────
// Nao chama useThreads - portanto nao re-renderiza quando emails chegam via SSE.
// Apenas ThreadListSection re-renderiza nesses casos; ThreadViewerPanel (memo)
// permanece intacto enquanto o usuario le ou redige um e-mail.

function Content({ inboxId, folderSlug }: InboxMailViewProps) {
  const { locale, messages } = useI18n();
  const copy = messages.inboxes;
  const router = useRouter();
  const { data: mailboxes } = useMailboxes();
  const { openCompose } = useInboxCompose();

  const resolvedInboxId = useMemo(() => {
    try {
      return decodeURIComponent(inboxId);
    } catch {
      return inboxId;
    }
  }, [inboxId]);

  const mailbox = useMemo(
    () => mailboxes?.find((m) => m.id === resolvedInboxId) ?? mailboxes?.[0],
    [mailboxes, resolvedInboxId],
  );

  const { data: folders } = useMailFolders(mailbox?.id);
  const folderMatch = matchFolderBySlug(folders, folderSlug);

  const [folderListUnreadHint, setFolderListUnreadHint] = useState<number | null>(null);
  const [folderListTotalHint, setFolderListTotalHint] = useState<number | null>(null);
  useEffect(() => {
    setFolderListUnreadHint(null);
    setFolderListTotalHint(null);
  }, [folderMatch?.id, mailbox?.id]);

  const handleFolderUnreadHint = useCallback((n: number | null) => {
    setFolderListUnreadHint(n);
  }, []);

  const handleFolderTotalHint = useCallback((n: number | null) => {
    setFolderListTotalHint(n);
  }, []);

  const [selectedThreadId, setSelectedThreadId] = useQueryState(
    "t",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true, shallow: true }),
  );

  const isDraftsFolderView = useMemo(
    () => Boolean(folderMatch && isDraftsNavFolder(folderMatch)),
    [folderMatch],
  );
  const threadIdForDraftCompose = useMemo(() => {
    if (!isDraftsFolderView) return undefined;
    const t = selectedThreadId?.trim();
    return t || undefined;
  }, [isDraftsFolderView, selectedThreadId]);

  const draftThreadQuery = useThread(mailbox?.id, threadIdForDraftCompose);
  const openedDraftComposeKeyRef = useRef<string | null>(null);
  const prevDraftsSelectionRef = useRef<string>("");

  useEffect(() => {
    if (!isDraftsFolderView) {
      openedDraftComposeKeyRef.current = null;
      prevDraftsSelectionRef.current = "";
      return;
    }
    const cur = selectedThreadId?.trim() ?? "";
    if (prevDraftsSelectionRef.current !== cur) {
      openedDraftComposeKeyRef.current = null;
      prevDraftsSelectionRef.current = cur;
    }
    if (!cur || !mailbox?.id) return;
    if (!draftThreadQuery.isSuccess || !draftThreadQuery.data?.messages?.length) return;
    const msgs = draftThreadQuery.data.messages;
    const draftMsg =
      [...msgs].reverse().find((m) => m.flags.includes("$draft")) ?? msgs[msgs.length - 1];
    if (!draftMsg?.id) return;

    const key = `${cur}|${draftMsg.id}`;
    if (openedDraftComposeKeyRef.current === key) return;
    openedDraftComposeKeyRef.current = key;
    openCompose(draftMessageToComposeDraft(draftMsg, mailbox.id));
  }, [
    isDraftsFolderView,
    selectedThreadId,
    mailbox?.id,
    draftThreadQuery.data,
    draftThreadQuery.isSuccess,
    openCompose,
  ]);

  const patch = usePatchMessage();

  const handleSelectThread = useCallback(
    (thread: ThreadSummary) => {
      void setSelectedThreadId(thread.id);
      if (!mailbox?.id || !thread.unread || !thread.anchorEmailId) return;
      patch.mutate({
        emailId: thread.anchorEmailId,
        mailboxId: mailbox.id,
        threadId: thread.id,
        folderIdForBadge: folderMatch?.id,
        patch: { unread: false },
      });
    },
    [mailbox, patch, folderMatch?.id, setSelectedThreadId],
  );

  const handleThreadDelete = useCallback(
    async (emailId: string) => {
      if (!mailbox) return;
      await patch.mutateAsync({
        emailId,
        mailboxId: mailbox.id,
        threadId: selectedThreadId,
        patch: { delete: true },
      });
      void setSelectedThreadId("");
    },
    [mailbox, patch, selectedThreadId, setSelectedThreadId],
  );

  const handleThreadReply = useCallback(
    (draft: ComposeDraft) => {
      if (!mailbox) return;
      openCompose({ ...draft, mailboxId: mailbox.id });
    },
    [mailbox, openCompose],
  );

  const handleCompose = useCallback(() => openCompose(), [openCompose]);

  useMailStream(mailbox?.id);

  const folderLabel = getFolderLabel(folderSlug, locale);

  const sortedFolders = useMemo(() => {
    if (!folders) return [];
    return [...folders].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [folders]);

  const inboxAccountAddress = useMemo(
    () => mailboxes?.find((m) => m.id === resolvedInboxId)?.address,
    [mailboxes, resolvedInboxId],
  );

  const inboxHeaderBreadcrumb = useMemo(
    () => (
      <nav
        className="text-base text-neutral-500 dark:text-neutral-500"
        aria-label={messages.common.breadcrumb}
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li className="flex items-center gap-1.5">
            <Link href="/dashboard" className="hover:text-neutral-800 dark:hover:text-neutral-300">
              {messages.dashboard.dashboard}
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <BreadcrumbGt />
            <Link href="/inboxes" className="hover:text-neutral-800 dark:hover:text-neutral-300">
              {messages.dashboard.breadcrumbs.inboxes}
            </Link>
          </li>
          <li className="flex min-w-0 max-w-full items-center gap-1.5">
            <BreadcrumbGt />
            <MailboxBreadcrumbSwitcher
              mailboxes={mailboxes}
              currentId={resolvedInboxId}
              folderSlug={folderSlug}
              currentAddress={inboxAccountAddress}
              switchMailboxLabel={copy.switchMailbox}
              copyAddressLabel={copy.copyMailboxAddress}
            />
          </li>
          <li className="flex items-center gap-1.5">
            <BreadcrumbGt />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{folderLabel}</span>
          </li>
        </ol>
      </nav>
    ),
    [
      copy.copyMailboxAddress,
      copy.switchMailbox,
      folderLabel,
      folderSlug,
      inboxAccountAddress,
      mailboxes,
      messages,
      resolvedInboxId,
    ],
  );

  const viewerSlot = (
    <ThreadViewerPanel
      mailboxId={mailbox?.id}
      mailboxAddress={mailbox?.address}
      folderIdForBadge={folderMatch?.id}
      threadId={selectedThreadId}
      onDelete={handleThreadDelete}
      onReply={handleThreadReply}
      selectConversationLabel={copy.selectConversation}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/90 dark:border-hub-border dark:bg-[#0f0f0f] lg:flex">
        <div className="border-b border-neutral-200 p-3 dark:border-hub-border">
          <InboxComposeTrigger />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {sortedFolders.map((f) => {
            const slug = (f.role ?? f.name.toLowerCase().replace(/\s+/g, "-")) || "inbox";
            const active = f.id === folderMatch?.id;
            const badge = sidebarFolderBadge(f, folderMatch?.id, folderListUnreadHint, folderListTotalHint);
            const Icon = folderNavIcon(f);
            return (
              <Link
                key={f.id}
                href={inboxFolderHref(mailbox?.id ?? inboxId, slug)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm",
                  active
                    ? "bg-neutral-200/90 font-medium text-neutral-950 dark:bg-white/10 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-white/5",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 stroke-[1.75] text-slate-500 dark:text-neutral-400",
                    active && "text-neutral-800 dark:text-neutral-200",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                {badge > 0 ? (
                  <span className="shrink-0 rounded bg-neutral-900 px-1.5 text-[10px] font-medium text-white dark:bg-white dark:text-neutral-900">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardShell
          breadcrumb={inboxHeaderBreadcrumb}
          contentClassName="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5"
          headerClassName="!py-3 sm:!py-3.5 lg:!py-4"
        >
          <div className="mb-3 flex w-full flex-col gap-3 lg:hidden">
            <InboxComposeTrigger />
            <select
              value={folderMatch?.id ?? ""}
              onChange={(event) => {
                const folder = sortedFolders.find((item) => item.id === event.target.value);
                if (!folder) return;
                const slug = (folder.role ?? folder.name.toLowerCase().replace(/\s+/g, "-")) || "inbox";
                router.push(inboxFolderHref(mailbox?.id ?? inboxId, slug));
              }}
              className="w-full rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
              aria-label={copy.labels}
            >
              {sortedFolders.map((folder) => {
                const mb = sidebarFolderBadge(folder, folderMatch?.id, folderListUnreadHint, folderListTotalHint);
                return (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                    {mb > 0 ? ` (${mb})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <ThreadListSection
            mailboxId={mailbox?.id}
            folderId={folderMatch?.id}
            folderSlug={folderSlug}
            locale={locale}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            onCompose={handleCompose}
            viewerSlot={viewerSlot}
            copy={copy}
            onFolderUnreadHint={handleFolderUnreadHint}
            draftTotalHint={Boolean(folderMatch && isDraftsNavFolder(folderMatch))}
            onFolderTotalHint={handleFolderTotalHint}
          />
        </DashboardShell>
      </div>
    </div>
  );
}
