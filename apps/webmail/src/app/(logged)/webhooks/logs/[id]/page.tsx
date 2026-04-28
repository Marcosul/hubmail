"use client";

import { use } from "react";
import { EventDetailView } from "@/components/webhooks/event-detail-view";

export default function LogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EventDetailView id={id} />;
}
