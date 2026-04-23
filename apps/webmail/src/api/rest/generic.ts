export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  signal?: AbortSignal;
};

function getRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
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
  const { method = "GET", body, headers, cache = "no-store", signal } = options;
  const merged = mergeHeaders({ "Content-Type": "application/json" }, headers);
  const res = await fetch(getRequestUrl(path), {
    method,
    cache,
    signal,
    credentials: "include",
    headers: merged,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as TResponse;
}
