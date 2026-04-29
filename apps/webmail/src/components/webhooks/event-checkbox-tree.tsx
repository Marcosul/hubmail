"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { WebhookCatalogItem, WebhookEventType } from "@hubmail/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

function GroupCheckbox({
  state,
  onChange,
}: {
  state: "checked" | "unchecked" | "indeterminate";
  onChange: (next: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "indeterminate";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "checked"}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface Props {
  catalog: WebhookCatalogItem[];
  selected: WebhookEventType[];
  onChange: (next: WebhookEventType[]) => void;
}

interface Group {
  label: string;
  items: WebhookCatalogItem[];
  children: Group[];
}

function buildGroups(catalog: WebhookCatalogItem[]): Group[] {
  // Agrupa pelo primeiro segmento ("domain", "message"), e dentro de "message"
  // sub-agrupa "received" para imitar o catálogo do AgentMail.
  const byHead = new Map<string, WebhookCatalogItem[]>();
  for (const item of catalog) {
    const head = item.name.split(".")[0]!;
    const arr = byHead.get(head) ?? [];
    arr.push(item);
    byHead.set(head, arr);
  }
  const out: Group[] = [];
  for (const [head, items] of byHead) {
    if (head === "message") {
      const direct: WebhookCatalogItem[] = [];
      const received: WebhookCatalogItem[] = [];
      for (const it of items) {
        if (it.name.startsWith("message.received")) received.push(it);
        else direct.push(it);
      }
      const children: Group[] = received.length
        ? [{ label: "received", items: received, children: [] }]
        : [];
      out.push({ label: head, items: direct, children });
    } else {
      out.push({ label: head, items, children: [] });
    }
  }
  return out;
}

export function EventCheckboxTree({ catalog, selected, onChange }: Props) {
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ message: true, received: true });

  const groups = useMemo(() => buildGroups(catalog), [catalog]);
  const filter = (it: WebhookCatalogItem) =>
    !query || it.name.toLowerCase().includes(query.toLowerCase());

  const toggle = (label: string) => setOpen((s) => ({ ...s, [label]: !s[label] }));

  const isChecked = (t: WebhookEventType) => selected.includes(t);
  const setChecked = (t: WebhookEventType, v: boolean) => {
    if (v) onChange(Array.from(new Set([...selected, t])));
    else onChange(selected.filter((x) => x !== t));
  };

  const groupItems = (g: Group): WebhookCatalogItem[] => [
    ...g.items,
    ...g.children.flatMap((c) => c.items),
  ];

  const groupState = (
    items: WebhookCatalogItem[],
  ): "checked" | "unchecked" | "indeterminate" => {
    if (items.length === 0) return "unchecked";
    const sel = items.filter((it) => isChecked(it.type)).length;
    if (sel === 0) return "unchecked";
    if (sel === items.length) return "checked";
    return "indeterminate";
  };

  const setGroupChecked = (items: WebhookCatalogItem[], v: boolean) => {
    const types = items.map((it) => it.type);
    if (v) {
      onChange(Array.from(new Set([...selected, ...types])));
    } else {
      const remove = new Set(types);
      onChange(selected.filter((x) => !remove.has(x)));
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 dark:border-hub-border">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <Search className="size-4 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchEvents}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>
      <ul className="max-h-72 overflow-auto py-1 text-sm">
        {groups.map((g) => {
          const visible = g.items.filter(filter);
          const childVisible = g.children.flatMap((c) => c.items.filter(filter));
          if (!visible.length && !childVisible.length && query) return null;
          return (
            <li key={g.label}>
              <div className="flex w-full items-center gap-2 px-3 py-1 font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5">
                <GroupCheckbox
                  state={groupState(groupItems(g))}
                  onChange={(v) => setGroupChecked(groupItems(g), v)}
                />
                <button
                  type="button"
                  onClick={() => toggle(g.label)}
                  className="flex flex-1 items-center gap-1 text-left"
                >
                  {open[g.label] ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  {g.label}
                </button>
              </div>
              {open[g.label] &&
                visible.map((it) => (
                  <label
                    key={it.type}
                    className="flex items-center gap-2 px-6 py-1 hover:bg-neutral-50 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked(it.type)}
                      onChange={(e) => setChecked(it.type, e.target.checked)}
                    />
                    <span className="font-mono text-xs">{it.name}</span>
                  </label>
                ))}
              {open[g.label] &&
                g.children.map((c) => {
                  const cv = c.items.filter(filter);
                  if (!cv.length && query) return null;
                  return (
                    <div key={c.label}>
                      <div className="flex w-full items-center gap-2 px-6 py-1 font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5">
                        <GroupCheckbox
                          state={groupState(c.items)}
                          onChange={(v) => setGroupChecked(c.items, v)}
                        />
                        <button
                          type="button"
                          onClick={() => toggle(c.label)}
                          className="flex flex-1 items-center gap-1 text-left"
                        >
                          {open[c.label] ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          {c.label}
                        </button>
                      </div>
                      {open[c.label] &&
                        cv.map((it) => (
                          <label
                            key={it.type}
                            className={cn(
                              "flex items-center gap-2 px-9 py-1 hover:bg-neutral-50 dark:hover:bg-white/5",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked(it.type)}
                              onChange={(e) => setChecked(it.type, e.target.checked)}
                            />
                            <span className="font-mono text-xs">{it.name}</span>
                          </label>
                        ))}
                    </div>
                  );
                })}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-hub-border">
        {selected.length === 0 ? (
          <>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {copy.receivingAll}
            </span>{" "}
            {copy.selectFromList}
          </>
        ) : (
          <span>{selected.length} selected</span>
        )}
      </div>
    </div>
  );
}
