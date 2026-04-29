"use client";

import Link from "next/link";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ActionMenu,
  DataList,
  DataListEmpty,
  DataListLoading,
  DataListPagination,
  DataListToolbar,
  type ActionMenuItem,
} from "@/components/data-list";
import { useI18n } from "@/i18n/client";
import {
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhookEndpoints,
} from "@/hooks/use-webhooks";
import { DeleteWebhookDialog } from "./delete-webhook-dialog";

export function EndpointList() {
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  const { data, isLoading } = useWebhookEndpoints();
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; url: string } | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (w) =>
        w.url.toLowerCase().includes(q) ||
        (w.description ?? "").toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {copy.list}
        </h2>
      </div>

      <DataList
        toolbar={
          <DataListToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="URL ou descrição"
            actions={
              <Link
                href="/webhooks/endpoints/new"
                className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                <Plus className="size-4" />
                {copy.newEndpoint}
              </Link>
            }
          />
        }
        footer={
          <DataListPagination
            summary={
              <span className="text-xs">
                {filtered.length} endpoint{filtered.length !== 1 ? "s" : ""}
              </span>
            }
          />
        }
      >
        {isLoading ? (
          <DataListLoading label={messages.common.loading} />
        ) : filtered.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {filtered.map((w) => {
              const menuItems: ActionMenuItem[] = [
                {
                  key: "edit",
                  label: "Editar",
                  icon: Pencil,
                  onClick: () => {
                    window.location.href = `/webhooks/endpoints/${w.id}`;
                  },
                },
                {
                  key: "toggle",
                  label: w.enabled ? messages.common.paused : messages.common.active,
                  icon: w.enabled ? PowerOff : Power,
                  onClick: () =>
                    update.mutate({ id: w.id, patch: { enabled: !w.enabled } }),
                },
                {
                  key: "delete",
                  label: copy.delete,
                  icon: Trash2,
                  danger: true,
                  separatorAbove: true,
                  onClick: () => setPendingDelete({ id: w.id, url: w.url }),
                },
              ];
              return (
                <li
                  key={w.id}
                  className="flex flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/webhooks/endpoints/${w.id}`}
                      className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      {w.url}
                    </Link>
                    {w.description ? (
                      <p className="truncate text-xs text-neutral-500">{w.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {w.events.length === 0
                        ? copy.receivingAll
                        : `${w.events.length} eventos`}
                    </p>
                  </div>
                  <span
                    className={
                      "inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[11px] font-medium " +
                      (w.enabled
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-hub-border dark:bg-[#1a1a1a] dark:text-neutral-400")
                    }
                  >
                    {w.enabled ? messages.common.active : messages.common.paused}
                  </span>
                  <ActionMenu items={menuItems} ariaLabel="Ações do endpoint" />
                </li>
              );
            })}
          </ul>
        ) : (
          <DataListEmpty description={searchQuery ? `Nenhum resultado para "${searchQuery}"` : copy.empty} />
        )}
      </DataList>

      {pendingDelete && (
        <DeleteWebhookDialog
          webhookUrl={pendingDelete.url}
          isDeleting={remove.isPending}
          onConfirm={() =>
            remove.mutate(pendingDelete.id, {
              onSuccess: () => setPendingDelete(null),
            })
          }
          onCancel={() => setPendingDelete(null)}
          error={remove.isError ? remove.error : null}
        />
      )}
    </section>
  );
}
