"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { WebhookScopeWorkspace } from "@hubmail/types";
import { useWebhookScopeOptions } from "@/hooks/use-webhooks";

const MAX_SCOPE = 10;

interface Props {
  workspaceIds: string[];
  inboxIds: string[];
  onChange: (next: { workspaceIds: string[]; inboxIds: string[] }) => void;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function ScopeSelector({ workspaceIds, inboxIds, onChange }: Props) {
  const { data, isLoading } = useWebhookScopeOptions();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return <p className="text-xs text-neutral-500">A carregar workspaces…</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-xs text-neutral-500">Sem workspaces disponíveis.</p>;
  }

  const totalScoped = workspaceIds.length + inboxIds.length;
  const wsLimited = workspaceIds.length >= MAX_SCOPE;
  const inLimited = inboxIds.length >= MAX_SCOPE;

  return (
    <div className="rounded-md border border-neutral-200 dark:border-hub-border">
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-hub-border">
        <span>
          {totalScoped === 0
            ? "Sem filtro — recebe eventos do workspace owner."
            : `${workspaceIds.length} workspace(s) · ${inboxIds.length} inbox(es)`}
        </span>
        <span className="text-neutral-400">máx. {MAX_SCOPE} por tipo</span>
      </header>
      <ul className="max-h-72 overflow-auto py-1 text-sm">
        {data.map((ws: WebhookScopeWorkspace) => {
          const wsChecked = workspaceIds.includes(ws.id);
          const expanded = open[ws.id] ?? false;
          return (
            <li key={ws.id}>
              <div className="flex items-center gap-2 px-3 py-1 hover:bg-neutral-50 dark:hover:bg-white/5">
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [ws.id]: !expanded }))}
                  className="text-neutral-400"
                  aria-label={expanded ? "Colapsar" : "Expandir"}
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
                <label className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={wsChecked}
                    disabled={!wsChecked && wsLimited}
                    onChange={() =>
                      onChange({
                        workspaceIds: toggle(workspaceIds, ws.id),
                        inboxIds,
                      })
                    }
                  />
                  <span className="font-medium">
                    {ws.name}
                    {ws.isOwner && (
                      <span className="ml-2 rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                        owner
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {ws.inboxes.length} inbox(es)
                  </span>
                </label>
              </div>
              {expanded &&
                (ws.inboxes.length === 0 ? (
                  <p className="px-9 py-1 text-xs text-neutral-400">Sem inboxes</p>
                ) : (
                  ws.inboxes.map((mb) => {
                    const checked = inboxIds.includes(mb.id);
                    return (
                      <label
                        key={mb.id}
                        className="flex items-center gap-2 px-9 py-1 text-xs hover:bg-neutral-50 dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && inLimited}
                          onChange={() =>
                            onChange({
                              workspaceIds,
                              inboxIds: toggle(inboxIds, mb.id),
                            })
                          }
                        />
                        <span className="font-mono">{mb.address}</span>
                        {mb.displayName ? (
                          <span className="text-neutral-400">— {mb.displayName}</span>
                        ) : null}
                      </label>
                    );
                  })
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
