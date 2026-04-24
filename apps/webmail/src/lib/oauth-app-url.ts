/**
 * Base pública do app para OAuth (redirect /auth/callback).
 * Usa NEXT_PUBLIC_APP_URL; senão, no client, cai no origin atual.
 */
export function getOAuthAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    try {
      const href = raw.includes("://") ? raw : `https://${raw}`;
      return new URL(href).origin;
    } catch {
      return raw.replace(/\/+$/g, "");
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin.trim();
  }
  return "";
}

function getOAuthRedirectOverride(): string | null {
  const raw = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    const href = raw.includes("://") ? raw : `https://${raw}`;
    const u = new URL(href);
    u.pathname = u.pathname.replace(/\s+$/g, "");
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * In production, never rely on NEXT_PUBLIC_* values baked in at build time only:
 * the OAuth redirect must match the host the user is on (e.g. hubmail.to), or
 * Supabase may fall back to the project Site URL (often localhost:3000).
 */
export function buildOAuthCallbackRedirectTo(): string {
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocal =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    if (!isLocal) {
      return new URL("/auth/callback", `${origin}/`).toString();
    }
  }

  const override = getOAuthRedirectOverride();
  if (override) {
    return override;
  }

  const base = getOAuthAppOrigin();
  if (!base) {
    const origin =
      typeof window !== "undefined" ? window.location.origin.trim().replace(/\/+$/g, "") : "";
    return new URL("/auth/callback", `${origin}/`).toString();
  }
  return new URL("/auth/callback", `${base}/`).toString();
}
