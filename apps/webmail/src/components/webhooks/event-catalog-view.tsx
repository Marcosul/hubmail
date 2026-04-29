"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { WebhookCatalogItem } from "@hubmail/types";
import { useI18n } from "@/i18n/client";
import { useWebhookCatalog } from "@/hooks/use-webhooks";
import { cn } from "@/lib/utils";
import { getWebhookSample } from "@/lib/webhook-samples";
import { getWebhookSchema } from "@/lib/webhook-schemas";
import { JsonBlock } from "./json-block";
import { SchemaTree } from "./schema-tree";

interface Group {
  label: string;
  items: WebhookCatalogItem[];
  children?: Group[];
}

function groupByHead(catalog: WebhookCatalogItem[]): Group[] {
  const map = new Map<string, WebhookCatalogItem[]>();
  for (const it of catalog) {
    const h = it.name.split(".")[0]!;
    map.set(h, [...(map.get(h) ?? []), it]);
  }
  const out: Group[] = [];
  for (const [head, items] of map) {
    if (head === "message") {
      const direct = items.filter((i) => !i.name.startsWith("message.received"));
      const received = items.filter((i) => i.name.startsWith("message.received"));
      out.push({
        label: head,
        items: direct,
        children: received.length ? [{ label: "received", items: received }] : [],
      });
    } else {
      out.push({ label: head, items });
    }
  }
  return out;
}

export function EventCatalogView() {
  const { messages } = useI18n();
  const copy = messages.webhooks.eventCatalog;
  const { data: catalog, isLoading } = useWebhookCatalog();
  const groups = useMemo(() => groupByHead(catalog ?? []), [catalog]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) return <p className="text-sm text-neutral-500">{messages.common.loading}</p>;

  const flat: WebhookCatalogItem[] = catalog ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <aside className="space-y-1">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {copy.title}
        </h3>
        <ul className="rounded-md border border-neutral-200 p-1 text-sm dark:border-hub-border">
          {groups.map((g) => (
            <li key={g.label}>
              <button
                type="button"
                onClick={() =>
                  setExpanded((s) => ({ ...s, [g.label]: !s[g.label] }))
                }
                className="flex w-full items-center gap-1 rounded px-2 py-1 font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {expanded[g.label] || g.children?.length ? (
                  expanded[g.label] ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )
                ) : null}
                {g.label}
              </button>
              {(expanded[g.label] || g.label === "domain") &&
                g.items.map((it) => (
                  <button
                    key={it.type}
                    type="button"
                    onClick={() => setSelected(it.name)}
                    className={cn(
                      "block w-full rounded px-5 py-1 text-left font-mono text-xs hover:bg-neutral-50 dark:hover:bg-white/5",
                      selected === it.name && "bg-neutral-100 dark:bg-white/10",
                    )}
                  >
                    {it.name}
                  </button>
                ))}
              {expanded[g.label] &&
                g.children?.map((c) => (
                  <div key={c.label}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((s) => ({ ...s, [c.label]: !s[c.label] }))
                      }
                      className="flex w-full items-center gap-1 rounded px-5 py-1 font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
                    >
                      {expanded[c.label] ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                      {c.label}
                    </button>
                    {expanded[c.label] &&
                      c.items.map((it) => (
                        <button
                          key={it.type}
                          type="button"
                          onClick={() => setSelected(it.name)}
                          className={cn(
                            "block w-full rounded px-8 py-1 text-left font-mono text-xs hover:bg-neutral-50 dark:hover:bg-white/5",
                            selected === it.name && "bg-neutral-100 dark:bg-white/10",
                          )}
                        >
                          {it.name}
                        </button>
                      ))}
                  </div>
                ))}
            </li>
          ))}
        </ul>
      </aside>

      <section className="space-y-3">
        {(selected ? flat.filter((i) => i.name === selected) : flat).map((it) => (
          <details
            key={it.type}
            open={!!selected || flat.length <= 1}
            className="rounded-md border border-neutral-200 dark:border-hub-border"
          >
            <summary className="cursor-pointer px-4 py-3 font-mono text-sm font-semibold">
              {it.name}
            </summary>
            <div className="grid gap-3 border-t border-neutral-200 p-4 md:grid-cols-2 dark:border-hub-border">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-neutral-500">Schema</h4>
                <SchemaTree fields={getWebhookSchema(it.name)} />
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                  Example {it.name}
                </h4>
                <JsonBlock title={`Example ${it.name}`} value={getWebhookSample(it.name)} />
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
