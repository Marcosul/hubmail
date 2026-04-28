"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useI18n } from "@/i18n/client";

type Props = {
  webhookUrl: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  error?: Error | null;
};

export function DeleteWebhookDialog({
  webhookUrl,
  isDeleting,
  onConfirm,
  onCancel,
  error,
}: Props) {
  const { messages } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Eliminar webhook
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Warning message */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
            <p className="text-sm text-red-900 dark:text-red-100">
              Esta ação não pode ser desfeita. O webhook será removido permanentemente do Hubmail e do Stalwart.
            </p>
          </div>

          {/* Webhook URL preview */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Endpoint
            </label>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {webhookUrl}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeleting ? "Eliminando…" : "Eliminar webhook"}
            </button>
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
