import { notFound, redirect } from "next/navigation";
import { InboxMailView } from "@/components/inboxes/inbox-mail-view";
import { isInboxFolderSlug } from "@/lib/inbox-routes";

type PageProps = {
  params: Promise<{ inboxId: string; folder: string }>;
};

export default async function InboxFolderPage({ params }: PageProps) {
  const { inboxId, folder: folderParam } = await params;
  if (!inboxId?.trim()) {
    redirect("/dashboard/inboxes");
  }

  const folder = (folderParam ?? "").toLowerCase();
  if (!isInboxFolderSlug(folder)) {
    notFound();
  }

  return <InboxMailView inboxId={inboxId} folderSlug={folder} />;
}
