"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import {
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhookEndpoint,
} from "@/hooks/use-webhooks";
import { cn } from "@/lib/utils";
import { EndpointOverviewTab } from "./endpoint-overview-tab";
import { EndpointTestingTab } from "./endpoint-testing-tab";
import { EndpointAdvancedTab } from "./endpoint-advanced-tab";
import { SubscribedEventsCard } from "./subscribed-events-card";
import { SigningSecretCard } from "./signing-secret-card";
import { MessageAttemptsSection } from "./message-attempts-section";
import { DeleteWebhookDialog } from "./delete-webhook-dialog";

type SubTab = "overview" | "testing" | "advanced";

const TABS: { key: SubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "testing", label: "Testing" },
  { key: "advanced", label: "Advanced" },
];

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6);
}

export function EndpointDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { messages, locale } = useI18n();
  const { data: webhook, isLoading } = useWebhookEndpoint(id);
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();

  const [tab, setTab] = useState<SubTab>("overview");
  const [urlDraft, setUrlDraft] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading || !webhook) {
    return <p className="text-sm text-neutral-500">{messages.common.loading}</p>;
  }

  const currentUrl = editingUrl ? urlDraft : webhook.url;

  const handleSaveUrl = async () => {
    if (!urlDraft || urlDraft === webhook.url) {
      setEditingUrl(false);
      return;
    }
    try {
      new URL(urlDraft);
    } catch {
      alert("URL inválida");
      return;
    }
    await update.mutateAsync({ id: webhook.id, patch: { url: urlDraft } });
    setEditingUrl(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await remove.mutateAsync(webhook.id);
      router.push("/webhooks/endpoints");
    } catch {
      // Erro é capturado pelo dialog
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        <Link href="/webhooks/endpoints" className="hover:underline">
          Endpoints
        </Link>{" "}
        / <span className="font-mono">{shortId(webhook.id)}</span>
      </p>

      <div className="flex items-start gap-4">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={currentUrl}
            onChange={(e) => {
              if (!editingUrl) {
                setUrlDraft(webhook.url);
                setEditingUrl(true);
              }
              setUrlDraft(e.target.value);
            }}
            onFocus={() => {
              if (!editingUrl) {
                setUrlDraft(webhook.url);
                setEditingUrl(true);
              }
            }}
            className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card"
          />
          {editingUrl && (
            <>
              <button
                type="button"
                onClick={() => setEditingUrl(false)}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-hub-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUrl}
                disabled={update.isPending}
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Save
              </button>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label="More actions"
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white text-sm shadow-lg dark:border-hub-border dark:bg-hub-card">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowDeleteDialog(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="size-4" />
                Delete endpoint
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <nav className="flex gap-1 border-b border-neutral-200 dark:border-hub-border">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div>
            {tab === "overview" && <EndpointOverviewTab webhook={webhook} />}
            {tab === "testing" && <EndpointTestingTab webhookId={webhook.id} />}
            {tab === "advanced" && <EndpointAdvancedTab webhook={webhook} />}
          </div>

          <MessageAttemptsSection webhookId={webhook.id} />
        </div>

        <aside className="space-y-5 text-sm">
          <section>
            <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Creation Date
            </h3>
            <p className="text-xs text-neutral-500">
              {new Date(webhook.createdAt).toLocaleString(locale)}
            </p>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Last Updated
            </h3>
            <p className="text-xs text-neutral-500">
              {new Date(webhook.updatedAt).toLocaleString(locale)}
            </p>
          </section>
          <SubscribedEventsCard webhookId={webhook.id} events={webhook.events} />
          <SigningSecretCard webhookId={webhook.id} />
        </aside>
      </div>

      {showDeleteDialog && (
        <DeleteWebhookDialog
          webhookUrl={webhook.url}
          isDeleting={remove.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
          error={remove.isError ? remove.error : null}
        />
      )}
    </div>
  );
}
