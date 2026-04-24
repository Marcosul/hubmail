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

export function buildOAuthCallbackRedirectTo(): string {
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
