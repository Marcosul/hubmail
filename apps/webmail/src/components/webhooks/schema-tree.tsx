"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { FieldKind, SchemaField } from "@/lib/webhook-schemas";

const KIND_BADGE: Record<FieldKind, string> = {
  string: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  integer: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  number: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  boolean: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  object: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "array[]": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

function Badge({ kind, label }: { kind: FieldKind; label?: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${KIND_BADGE[kind]}`}
    >
      {label ?? kind}
    </span>
  );
}

function FieldNode({ field, depth = 0 }: { field: SchemaField; depth?: number }) {
  const expandable =
    field.kind === "object" ||
    (field.kind === "array[]" && field.itemKind === "object");
  const [open, setOpen] = useState(depth < 1);

  const itemCount = field.children?.length ?? 0;

  return (
    <div className="border-b border-neutral-200 py-2 last:border-b-0 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 text-left ${expandable ? "cursor-pointer" : "cursor-default"}`}
      >
        {expandable ? (
          open ? (
            <ChevronDown className="size-3.5 shrink-0 text-neutral-500" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-neutral-500" />
          )
        ) : (
          <span className="inline-block size-3.5 shrink-0" />
        )}
        <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          {field.name}
        </span>
        <Badge kind={field.kind} />
        {field.format ? (
          <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-300">
            {field.format}
          </span>
        ) : null}
        {field.const !== undefined ? (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            const
          </span>
        ) : null}
        {field.optional ? (
          <span className="text-[11px] italic text-neutral-500">Optional</span>
        ) : null}
      </button>

      {field.description ? (
        <p className="ml-5 mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {field.description}
        </p>
      ) : null}

      {expandable && open ? (
        <div className="ml-5 mt-2">
          {field.kind === "object" ? (
            <p className="mb-1 text-[11px] font-medium text-teal-600 dark:text-teal-300">
              {itemCount} {itemCount === 1 ? "Item" : "Items"}
            </p>
          ) : (
            <details className="mb-1" open={depth < 1}>
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                <ChevronDown className="size-3.5 text-neutral-500" />
                Item <Badge kind="object" />
                <span className="text-[11px] italic text-neutral-500">Optional</span>
              </summary>
              <p className="ml-5 mt-1 text-[11px] font-medium text-teal-600 dark:text-teal-300">
                {itemCount} {itemCount === 1 ? "Item" : "Items"}
              </p>
            </details>
          )}
          <div className="border-l border-neutral-200 pl-3 dark:border-neutral-800">
            {(field.children ?? []).map((c) => (
              <FieldNode key={c.name} field={c} depth={depth + 1} />
            ))}
          </div>
        </div>
      ) : null}

      {!expandable && (field.const !== undefined || field.enum || field.title) ? (
        <div className="ml-5 mt-1.5 overflow-hidden rounded-md border border-neutral-200 text-[11px] dark:border-neutral-700">
          {field.title ? (
            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
              <div className="w-32 bg-neutral-50 px-2 py-1 font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Field Name
              </div>
              <div className="flex-1 bg-white px-2 py-1 font-mono text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                {field.name}
              </div>
            </div>
          ) : null}
          {field.title ? (
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
              <div className="w-32 bg-neutral-50 px-2 py-1 font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Title
              </div>
              <div className="flex-1 bg-white px-2 py-1 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                {field.title}
              </div>
            </div>
          ) : null}
          {field.const !== undefined ? (
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
              <div className="w-32 bg-neutral-50 px-2 py-1 font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Const
              </div>
              <div className="flex-1 bg-white px-2 py-1 font-mono text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                &quot;{field.const}&quot;
              </div>
            </div>
          ) : null}
          {field.enum ? (
            <div className="flex">
              <div className="w-32 bg-neutral-50 px-2 py-1 font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Enum
              </div>
              <div className="flex flex-1 flex-wrap gap-1 bg-white px-2 py-1 dark:bg-neutral-950">
                {field.enum.map((v) => (
                  <span
                    key={v}
                    className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SchemaTree({ fields }: { fields: SchemaField[] }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
      {fields.map((f) => (
        <FieldNode key={f.name} field={f} />
      ))}
    </div>
  );
}
