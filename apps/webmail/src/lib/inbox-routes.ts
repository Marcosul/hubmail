import type { MailFolderSummary } from "@hubmail/types";

/**
 * Inbox + folder URLs: `/dashboard/inboxes/{inboxId}/{folderSlug}` (inboxId URL-encoded).
 */
export const INBOX_FOLDER_SLUGS = [
  "inbox",
  "starred",
  "sent",
  "drafts",
  "important",
  "scheduled",
  "all-mail",
  "spam",
  "trash",
] as const;

export type InboxFolderSlug = (typeof INBOX_FOLDER_SLUGS)[number];

type FolderLocale = "pt-BR" | "en-US" | "es-ES";

const folderLabels: Record<FolderLocale, Record<InboxFolderSlug, string>> = {
  "pt-BR": {
    inbox: "Inbox",
    starred: "Favoritos",
    sent: "Enviados",
    drafts: "Rascunhos",
    important: "Importantes",
    scheduled: "Agendados",
    "all-mail": "Todos os emails",
    spam: "Spam",
    trash: "Lixeira",
  },
  "en-US": {
    inbox: "Inbox",
    starred: "Starred",
    sent: "Sent",
    drafts: "Drafts",
    important: "Important",
    scheduled: "Scheduled",
    "all-mail": "All mail",
    spam: "Spam",
    trash: "Trash",
  },
  "es-ES": {
    inbox: "Inbox",
    starred: "Favoritos",
    sent: "Enviados",
    drafts: "Borradores",
    important: "Importantes",
    scheduled: "Programados",
    "all-mail": "Todos los emails",
    spam: "Spam",
    trash: "Papelera",
  },
};

export function isInboxFolderSlug(s: string): s is InboxFolderSlug {
  return (INBOX_FOLDER_SLUGS as readonly string[]).includes(s);
}

export function getFolderLabel(slug: string, locale: FolderLocale = "pt-BR"): string {
  if (isInboxFolderSlug(slug)) return folderLabels[locale]?.[slug] ?? folderLabels["pt-BR"][slug];
  return slug;
}

export function inboxFolderHref(inboxId: string, folderSlug: string) {
  return `/dashboard/inboxes/${encodeURIComponent(inboxId)}/${folderSlug}`;
}

/** Slug da pasta Enviados para navegação (JMAP `role: sent` ou nomes como "Sent Items"). */
export function resolveSentFolderSlug(folders: MailFolderSummary[] | undefined): string {
  if (!folders?.length) return "sent";
  const normRole = (r: string | undefined | null) =>
    (r ?? "").toLowerCase().replace(/^\/|\/$/g, "");
  const sent =
    folders.find((f) => normRole(f.role) === "sent") ??
    folders.find((f) => {
      const n = f.name.toLowerCase();
      if (n.includes("draft")) return false;
      if (n.includes("resent")) return false;
      if (n.includes("enviad")) return true;
      return n.includes("sent");
    });
  if (!sent) return "sent";
  const raw = sent.role?.trim()
    ? normRole(sent.role)
    : sent.name.toLowerCase().replace(/\s+/g, "-");
  return raw || "sent";
}
