"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function SecretDisplay({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { messages } = useI18n();
  const copy = messages.webhooks.endpoints;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="mb-2 text-amber-900 dark:text-amber-200">{copy.secretIntro}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-white px-2 py-1 font-mono text-xs text-neutral-800 dark:bg-black/40 dark:text-neutral-100">
          {revealed ? secret : "•".repeat(Math.min(secret.length, 32))}
        </code>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded p-1 text-neutral-500 hover:bg-white/50 dark:hover:bg-white/10"
          aria-label={copy.showSecret}
        >
          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-1 text-neutral-500 hover:bg-white/50 dark:hover:bg-white/10"
          aria-label={copy.copySecret}
        >
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
