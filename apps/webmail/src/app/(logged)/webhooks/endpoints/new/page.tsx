"use client";

import Link from "next/link";
import { EndpointForm } from "@/components/webhooks/endpoint-form";
import { useI18n } from "@/i18n/client";

export default function NewEndpointPage() {
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        <Link href="/webhooks/endpoints" className="hover:underline">
          {copy.backToEndpoints}
        </Link>{" "}
        / <span className="text-neutral-700 dark:text-neutral-200">{copy.newEndpoint}</span>
      </p>
      <EndpointForm />
    </div>
  );
}
