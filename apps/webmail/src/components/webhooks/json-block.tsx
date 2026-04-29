"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Realça JSON com cores estilo dashboard da AgentMail. Tokeniza por regex em
 * cima do `JSON.stringify` (entrada confiável produzida no client), depois
 * envolve cada token em um <span> com a classe correspondente.
 */
function highlightJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2) ?? "";
  const escaped = escapeHtml(text);
  return escaped.replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
    (_m, key, str, lit, num) => {
      if (key) return `<span class="text-sky-300">${key}</span>`;
      if (str) return `<span class="text-amber-300">${str}</span>`;
      if (lit) return `<span class="text-rose-300">${lit}</span>`;
      if (num) return `<span class="text-emerald-300">${num}</span>`;
      return _m;
    },
  );
}

interface Props {
  title?: string;
  value: unknown;
  className?: string;
}

export function JsonBlock({ title, value, className }: Props) {
  const html = useMemo(() => highlightJson(value), [value]);
  const text = useMemo(() => JSON.stringify(value, null, 2) ?? "", [value]);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 text-xs text-neutral-100 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          {title ?? "JSON"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-neutral-800"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="max-h-80 flex-1 overflow-y-auto p-3 leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
