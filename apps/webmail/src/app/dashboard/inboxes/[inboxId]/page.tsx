import { redirect } from "next/navigation";
import { inboxFolderHref } from "@/lib/inbox-routes";

type PageProps = {
  params: Promise<{ inboxId: string }>;
};

/**
 * A listagem de inboxes liga a `/…/inbox/sent` por omissão (como o agentmail).
 */
export default async function InboxRootPage({ params }: PageProps) {
  const { inboxId } = await params;
  if (!inboxId?.trim()) {
    redirect("/dashboard/inboxes");
  }
  redirect(inboxFolderHref(inboxId, "sent"));
}
