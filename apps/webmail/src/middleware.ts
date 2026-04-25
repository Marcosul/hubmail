import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isFatalAuthSessionError } from "@/lib/supabase/auth-session-errors";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";

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

  const isDashboardPath = pathname.startsWith("/dashboard");
  const isLoginPath = pathname === "/login";
  const isCallbackPath = pathname.startsWith("/auth/callback");

  if (!isDashboardPath && !isLoginPath && !isCallbackPath) {
    return NextResponse.next();
  }

  const client = createSupabaseMiddlewareClient(request);
  if (!client) {
    if (isDashboardPath) {
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

  if (isDashboardPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/overview";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return client.response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
};
