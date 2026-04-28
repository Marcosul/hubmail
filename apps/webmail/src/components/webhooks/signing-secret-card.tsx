"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useRotateWebhookSecret } from "@/hooks/use-webhooks";

export function SigningSecretCard({
  webhookId,
  initialSecret,
}: {
  webhookId: string;
  initialSecret?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secret, setSecret] = useState<string | null>(initialSecret ?? null);
  const rotate = useRotateWebhookSecret();

  const masked = "••••••••••••";

  const handleCopy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleRotate = async () => {
    if (!confirm("Rotacionar o secret invalida assinaturas atuais. Continuar?")) return;
    const res = await rotate.mutateAsync(webhookId);
    setSecret(res.secret);
    setRevealed(true);
  };

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Signing Secret
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <code className="flex-1 truncate rounded bg-neutral-100 px-2 py-1 font-mono text-xs dark:bg-white/10">
              {revealed && secret ? secret : masked}
            </code>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              aria-label="Reveal secret"
              disabled={!secret}
              title={secret ? undefined : "Use 'Rotate' para gerar e revelar um novo secret"}
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!secret}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              aria-label="Copy secret"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleRotate}
            disabled={rotate.isPending}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:underline dark:text-neutral-300"
          >
            <RefreshCw className={`size-3 ${rotate.isPending ? "animate-spin" : ""}`} />
            Rotate secret
          </button>
        </div>
      )}
    </section>
  );
}
