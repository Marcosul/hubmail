import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const {
    data: { user },
  } = await client.supabase.auth.getUser();

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
