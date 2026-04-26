import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

const OAUTH_NEXT_COOKIE = "hubmail_oauth_next";

function getSafeNextPath(nextValue: string | null) {
  if (!nextValue) {
    return "/dashboard";
  }

  if (!nextValue.startsWith("/") || nextValue.startsWith("//")) {
    return "/dashboard";
  }

  return nextValue;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const cookieNextPath = cookieStore.get(OAUTH_NEXT_COOKIE)?.value?.trim() ?? null;
  const nextPath = getSafeNextPath(cookieNextPath || requestUrl.searchParams.get("next"));
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
