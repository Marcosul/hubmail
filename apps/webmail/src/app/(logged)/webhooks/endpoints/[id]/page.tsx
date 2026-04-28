"use client";

import Link from "next/link";
import { use } from "react";
import { EndpointForm } from "@/components/webhooks/endpoint-form";
import { useI18n } from "@/i18n/client";
import { useWebhookEndpoints } from "@/hooks/use-webhooks";

export default function EditEndpointPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  const { data, isLoading } = useWebhookEndpoints();
  const endpoint = data?.find((w) => w.id === id);

  if (isLoading) return <p className="text-sm text-neutral-500">{messages.common.loading}</p>;
  if (!endpoint) {
    return (
      <p className="text-sm text-neutral-500">
        <Link href="/webhooks/endpoints" className="underline">
          {copy.backToEndpoints}
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        <Link href="/webhooks/endpoints" className="hover:underline">
          {copy.backToEndpoints}
        </Link>{" "}
        / <span className="text-neutral-700 dark:text-neutral-200">{copy.editTitle}</span>
      </p>
      <EndpointForm
        initial={{
          id: endpoint.id,
          url: endpoint.url,
          description: endpoint.description,
          events: endpoint.events,
          enabled: endpoint.enabled,
        }}
      />
    </div>
  );
}
