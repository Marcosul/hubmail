import type { MailFolderSummary } from "@hubmail/types";

/**
 * Inbox + folder URLs: `/inboxes/{inboxId}/{folderSlug}` (inboxId URL-encoded).
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
    inbox: "Caixa de Entrada",
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
    inbox: "Bandeja de entrada",
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
  return `/inboxes/${encodeURIComponent(inboxId)}/${folderSlug}`;
}

/**
 * Identifica o "papel" canônico da pasta a partir de `role` (JMAP) ou nome
 * (servidores como Stalwart usam "Sent Items", "Junk Mail", "Deleted Items").
 */
type CanonicalFolderRole =
  | "inbox"
  | "drafts"
  | "sent"
  | "junk"
  | "trash"
  | "archive"
  | "important"
  | "starred"
  | "scheduled"
  | "all-mail"
  | "other";

export function canonicalFolderRole(folder: {
  role?: string | null;
  name: string;
}): CanonicalFolderRole {
  const role = (folder.role ?? "").toLowerCase().replace(/^\/|\/$/g, "");
  const name = folder.name.toLowerCase();

  if (role === "inbox" || name === "inbox" || name.includes("caixa de entrada")) return "inbox";
  if (role === "drafts" || role === "draft" || name.includes("draft") || name.includes("rascunho") || name.includes("borrador")) return "drafts";
  if (role === "sent" || name.includes("sent") || name.includes("enviad")) return "sent";
  if (role === "junk" || name.includes("junk") || name.includes("spam") || name.includes("lixo eletr")) return "junk";
  if (role === "trash" || name.includes("trash") || name.includes("deleted") || name.includes("lixeira") || name.includes("papelera")) return "trash";
  if (role === "archive" || name.includes("archive") || name.includes("arquiv")) return "archive";
  if (role === "important" || name.includes("important")) return "important";
  if (name.includes("starred") || name.includes("favorit")) return "starred";
  if (name.includes("scheduled") || name.includes("agendad") || name.includes("programad")) return "scheduled";
  if (name.includes("all mail") || name === "all" || name.includes("todos os emails") || name.includes("todos los emails")) return "all-mail";
  return "other";
}

/** Ordem canônica padrão das pastas no sidebar. */
const FOLDER_ROLE_ORDER: Record<CanonicalFolderRole, number> = {
  inbox: 0,
  drafts: 1,
  sent: 2,
  junk: 3,
  trash: 4,
  archive: 5,
  important: 6,
  starred: 7,
  scheduled: 8,
  "all-mail": 9,
  other: 100,
};

const ROLE_LABELS: Record<FolderLocale, Record<CanonicalFolderRole, string>> = {
  "pt-BR": {
    inbox: "Caixa de Entrada",
    drafts: "Rascunhos",
    sent: "Enviados",
    junk: "Spam",
    trash: "Lixeira",
    archive: "Arquivo",
    important: "Importantes",
    starred: "Favoritos",
    scheduled: "Agendados",
    "all-mail": "Todos os emails",
    other: "",
  },
  "en-US": {
    inbox: "Inbox",
    drafts: "Drafts",
    sent: "Sent",
    junk: "Spam",
    trash: "Trash",
    archive: "Archive",
    important: "Important",
    starred: "Starred",
    scheduled: "Scheduled",
    "all-mail": "All mail",
    other: "",
  },
  "es-ES": {
    inbox: "Bandeja de entrada",
    drafts: "Borradores",
    sent: "Enviados",
    junk: "Spam",
    trash: "Papelera",
    archive: "Archivo",
    important: "Importantes",
    starred: "Favoritos",
    scheduled: "Programados",
    "all-mail": "Todos los emails",
    other: "",
  },
};

/** Nome de exibição traduzido da pasta; mantém o nome do servidor para pastas customizadas. */
export function getDisplayFolderName(
  folder: { role?: string | null; name: string },
  locale: FolderLocale = "pt-BR",
): string {
  const role = canonicalFolderRole(folder);
  if (role === "other") return folder.name;
  return ROLE_LABELS[locale]?.[role] ?? ROLE_LABELS["pt-BR"][role];
}

/** Comparator para ordenar pastas seguindo a ordem canônica (Inbox > Rascunhos > Enviados > Spam > Lixeira). */
export function compareFoldersByRole(
  a: { role?: string | null; name: string; sortOrder?: number | null },
  b: { role?: string | null; name: string; sortOrder?: number | null },
): number {
  const ra = FOLDER_ROLE_ORDER[canonicalFolderRole(a)];
  const rb = FOLDER_ROLE_ORDER[canonicalFolderRole(b)];
  if (ra !== rb) return ra - rb;
  const sa = a.sortOrder ?? 0;
  const sb = b.sortOrder ?? 0;
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name);
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
