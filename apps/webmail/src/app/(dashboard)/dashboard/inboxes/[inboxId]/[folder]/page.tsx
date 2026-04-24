import { notFound, redirect } from "next/navigation";
import { InboxMailView } from "@/components/inboxes/inbox-mail-view";
import { isInboxFolderSlug } from "@/lib/inbox-routes";

type PageProps = {
  params: Promise<{ inboxId: string; folder: string }>;
  searchParams?: Promise<{ threadId?: string }>;
};

export default async function InboxFolderPage({ params, searchParams }: PageProps) {
  const { inboxId, folder: folderParam } = await params;
  const query = searchParams ? await searchParams : undefined;

  if (!inboxId?.trim()) {
    redirect("/dashboard/inboxes");
  }

  const folder = (folderParam ?? "").toLowerCase();
  if (!isInboxFolderSlug(folder)) {
    notFound();
  }

  return <InboxMailView inboxId={inboxId} folderSlug={folder} threadId={query?.threadId} />;
}
