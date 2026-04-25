import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  signal?: AbortSignal;
  workspaceId?: string;
  skipAuth?: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const WORKSPACE_COOKIE = "hubmail_workspace_id";

function readWorkspaceCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${WORKSPACE_COOKIE}=`));
  return match?.slice(WORKSPACE_COOKIE.length + 1) || undefined;
}

export function setActiveWorkspaceId(workspaceId: string | null | undefined) {
  if (typeof document === "undefined") return;
  if (!workspaceId) {
    document.cookie = `${WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${WORKSPACE_COOKIE}=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function getActiveWorkspaceId(): string | undefined {
  return readWorkspaceCookie();
}

function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path);
}

function getRequestUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  const base = resolveBaseUrl();
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  if (normalized.startsWith("/api/auth/logout") || normalized.startsWith("/api/auth/login")) {
    return normalized;
  }
  const baseNoSlash = base.replace(/\/$/, "");
  // NEXT_PUBLIC_API_URL muitas vezes inclui o prefixo global `/api` (ex.: …vercel.app/api).
  // Os caminhos do cliente já são `/api/...`; sem isto fica `…/api/api/mailboxes` e a API
  // devolve 404 — no browser isso costuma manifestar-se como “CORS” no preflight.
  if (baseNoSlash.endsWith("/api") && normalized.startsWith("/api/")) {
    normalized = normalized.replace(/^\/api/, "");
  }
  return `${baseNoSlash}${normalized}`;
}

function mergeHeaders(...sources: (HeadersInit | undefined)[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const src of sources) {
    if (!src) continue;
    if (src instanceof Headers) {
      src.forEach((value, key) => {
        out[key] = value;
      });
    } else if (Array.isArray(src)) {
      for (const [k, v] of src) out[k] = v;
    } else {
      Object.assign(out, src);
    }
  }
  return out;
}

async function resolveAccessToken(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(getRequestUrl(input), {
    ...init,
    credentials: init.credentials ?? "include",
    headers: mergeHeaders(init.headers),
  });
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    headers,
    cache = "no-store",
    signal,
    workspaceId,
    skipAuth,
  } = options;

  const authHeader: Record<string, string> = {};
  if (!skipAuth) {
    const token = await resolveAccessToken();
    if (token) authHeader.Authorization = `Bearer ${token}`;
  }

  const workspace = workspaceId ?? getActiveWorkspaceId();
  if (workspace) {
    authHeader["X-Workspace-Id"] = workspace;
  }

  const merged = mergeHeaders(
    { "Content-Type": "application/json" },
    authHeader,
    headers,
  );

  const res = await fetch(getRequestUrl(path), {
    method,
    cache,
    signal,
    credentials: "include",
    headers: merged,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let payload: unknown = null;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : text) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204) return undefined as TResponse;
  return (await res.json()) as TResponse;
}
