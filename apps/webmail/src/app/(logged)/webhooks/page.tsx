import { redirect } from "next/navigation";

export default function WebhooksIndex() {
  redirect("/webhooks/endpoints");
}
