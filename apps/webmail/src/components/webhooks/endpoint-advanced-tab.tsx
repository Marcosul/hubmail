"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Webhook } from "@hubmail/types";
import { useUpdateWebhook } from "@/hooks/use-webhooks";

type HeaderRow = { key: string; value: string };

function toRows(map: Record<string, string>): HeaderRow[] {
  return Object.entries(map).map(([key, value]) => ({ key, value }));
}

function toMap(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (k) out[k] = r.value;
  }
  return out;
}

export function EndpointAdvancedTab({ webhook }: { webhook: Webhook }) {
  const update = useUpdateWebhook();

  // Throttling
  const [throttleEditing, setThrottleEditing] = useState(false);
  const [throttleMs, setThrottleMs] = useState(webhook.throttleMs ?? 0);

  // Headers
  const [rows, setRows] = useState<HeaderRow[]>(toRows(webhook.headers));
  const [draftRow, setDraftRow] = useState<HeaderRow>({ key: "", value: "" });

  const saveThrottle = async () => {
    await update.mutateAsync({
      id: webhook.id,
      patch: { throttleMs: throttleMs > 0 ? throttleMs : null },
    });
    setThrottleEditing(false);
  };

  const persistHeaders = async (next: HeaderRow[]) => {
    setRows(next);
    await update.mutateAsync({ id: webhook.id, patch: { headers: toMap(next) } });
  };

  const addHeader = async () => {
    if (!draftRow.key.trim()) return;
    const next = [...rows.filter((r) => r.key !== draftRow.key.trim()), draftRow];
    await persistHeaders(next);
    setDraftRow({ key: "", value: "" });
  };

  const removeHeader = async (key: string) => {
    await persistHeaders(rows.filter((r) => r.key !== key));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-hub-border">
          <h3 className="text-sm font-semibold">Endpoint Throttling</h3>
          {throttleEditing ? (
            <button
              type="button"
              onClick={() => {
                setThrottleMs(webhook.throttleMs ?? 0);
                setThrottleEditing(false);
              }}
              className="flex items-center gap-1 text-xs"
            >
              <X className="size-3" />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setThrottleEditing(true)}
              className="flex items-center gap-1 text-xs"
            >
              <Pencil className="size-3" />
              Edit
            </button>
          )}
        </header>
        <div className="p-4 text-sm">
          {throttleEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={60000}
                step={100}
                value={throttleMs}
                onChange={(e) => setThrottleMs(parseInt(e.target.value || "0", 10))}
                className="w-32 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-hub-border dark:bg-hub-card"
              />
              <span className="text-xs text-neutral-500">ms entre tentativas (0 = sem throttle)</span>
              <button
                type="button"
                onClick={saveThrottle}
                disabled={update.isPending}
                className="ml-auto rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Save
              </button>
            </div>
          ) : webhook.throttleMs && webhook.throttleMs > 0 ? (
            <p>{webhook.throttleMs} ms entre tentativas</p>
          ) : (
            <p className="text-neutral-500">No throttling rate set</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-hub-border">
        <header className="border-b border-neutral-200 px-4 py-2 dark:border-hub-border">
          <h3 className="text-sm font-semibold">Custom Headers</h3>
        </header>
        <div className="space-y-2 p-4">
          {rows.length > 0 && (
            <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center gap-2 py-2 text-sm">
                  <code className="flex-1 truncate font-mono text-xs">{r.key}</code>
                  <code className="flex-1 truncate font-mono text-xs text-neutral-500">
                    {r.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => removeHeader(r.key)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={draftRow.key}
              onChange={(e) => setDraftRow({ ...draftRow, key: e.target.value })}
              placeholder="Key"
              className="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-hub-border dark:bg-hub-card"
            />
            <input
              value={draftRow.value}
              onChange={(e) => setDraftRow({ ...draftRow, value: e.target.value })}
              placeholder="Value"
              className="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-hub-border dark:bg-hub-card"
            />
            <button
              type="button"
              onClick={addHeader}
              disabled={!draftRow.key.trim() || update.isPending}
              className="rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-hub-border"
              aria-label="Add header"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
