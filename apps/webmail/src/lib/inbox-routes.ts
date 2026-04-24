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

const folderLabels: Record<InboxFolderSlug, string> = {
  inbox: "Inbox",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  important: "Important",
  scheduled: "Scheduled",
  "all-mail": "All mail",
  spam: "Spam",
  trash: "Trash",
};

export function isInboxFolderSlug(s: string): s is InboxFolderSlug {
  return (INBOX_FOLDER_SLUGS as readonly string[]).includes(s);
}

export function getFolderLabel(slug: string): string {
  if (isInboxFolderSlug(slug)) return folderLabels[slug];
  return slug;
}

export function inboxFolderHref(inboxId: string, folderSlug: string) {
  return `/dashboard/inboxes/${encodeURIComponent(inboxId)}/${folderSlug}`;
}
