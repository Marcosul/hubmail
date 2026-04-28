"use client";

import { use } from "react";
import { EndpointDetailView } from "@/components/webhooks/endpoint-detail-view";

export default function EndpointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EndpointDetailView id={id} />;
}
