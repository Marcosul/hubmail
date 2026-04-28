import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isFatalAuthSessionError } from "@/lib/supabase/auth-session-errors";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/agents",
  "/allow-block",
  "/api-keys",
  "/domains",
  "/inboxes",
  "/metrics",
  "/workspaces",
  "/upgrade",
  "/webhooks",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function normalizePathname(pathname: string) {
  try {
    return decodeURIComponent(pathname).replace(/\s+$/g, "");
  } catch {
    return pathname.replace(/\s+$/g, "");
  }
}

export async function middleware(request: NextRequest) {
  const rawPath = request.nextUrl.pathname;
  const pathname = normalizePathname(rawPath);
  if (pathname !== rawPath) {
    const url = new URL(request.url);
    url.pathname = pathname;
    return NextResponse.redirect(url);
  }

  const isProtected = isProtectedPath(pathname);
  const isLoginPath = pathname === "/login";
  const isCallbackPath = pathname.startsWith("/auth/callback");

  if (!isProtected && !isLoginPath && !isCallbackPath) {
    return NextResponse.next();
  }

  const client = createSupabaseMiddlewareClient(request);
  if (!client) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let user;
  let authError: unknown;
  try {
    const out = await client.supabase.auth.getUser();
    user = out.data.user;
    authError = out.error;
  } catch (e) {
    authError = e;
    user = null;
  }

  if (authError && isFatalAuthSessionError(authError)) {
    await client.supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    for (const c of client.response.cookies.getAll()) {
      redirectRes.cookies.set(c.name, c.value, c);
    }
    return redirectRes;
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPath && user) {
    const url = request.nextUrl.clone();
    const nextParam = url.searchParams.get("next");
    if (
      nextParam &&
      nextParam.startsWith("/") &&
      !nextParam.startsWith("//") &&
      isProtectedPath(nextParam)
    ) {
      url.pathname = nextParam;
    } else {
      url.pathname = "/dashboard";
    }
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return client.response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/allow-block/:path*",
    "/api-keys/:path*",
    "/domains/:path*",
    "/inboxes/:path*",
    "/metrics/:path*",
    "/workspaces/:path*",
    "/upgrade/:path*",
    "/webhooks/:path*",
    "/login",
    "/auth/:path*",
  ],
};
