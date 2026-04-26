"use client";

/**
 * Hook que conecta via SSE ao endpoint /api/mail/stream do backend e invalida
 * as queries do TanStack Query quando chega um evento (email recebido, enviado,
 * atualizado). Usa fetch em vez de EventSource para suportar os headers de auth
 * (Authorization + X-Workspace-Id).
 *
 * Quando o endpoint não está disponível (sem Redis, ambiente serverless ou erro
 * de rede) a conexão falha silenciosamente e o polling normal do TanStack Query
 * continua funcionando como fallback.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getActiveWorkspaceId } from "@/api/rest/generic";

const RETRY_DELAY_MS = 12_000;

function resolveStreamUrl(mailboxId: string): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  const params = new URLSearchParams({ mailboxId });
  // NEXT_PUBLIC_API_URL pode terminar com /api (caso Vercel) ou não ter o prefixo.
  const base = raw.endsWith("/api") ? raw : `${raw}/api`;
  return `${base}/mail/stream?${params}`;
}

async function resolveHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // sem auth — o servidor retornará 401, conexão encerra e não há retry
  }
  const workspaceId = getActiveWorkspaceId();
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
  return headers;
}

export function useMailStream(mailboxId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!mailboxId) return;

    let active = true;
    let controller: AbortController | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect(): Promise<void> {
      if (!active) return;
      controller = new AbortController();

      try {
        const headers = await resolveHeaders();
        const url = resolveStreamUrl(mailboxId!);

        const res = await fetch(url, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        // Servidor não disponível ou sem suporte SSE → fallback silencioso
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as {
                type: string;
                mailboxId: string;
              };
              if (event.mailboxId === mailboxId) {
                qc.invalidateQueries({ queryKey: ["mail-threads", mailboxId] });
                qc.invalidateQueries({ queryKey: ["mail-folders", mailboxId] });
              }
            } catch {
              // mensagem malformada
            }
          }
        }
      } catch (err) {
        if (!active) return;
        const isAborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!isAborted) {
          // Falha de rede → retry com atraso
          retryTimer = setTimeout(connect, RETRY_DELAY_MS);
        }
      }
    }

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      controller?.abort();
    };
  }, [mailboxId, qc]);
}
