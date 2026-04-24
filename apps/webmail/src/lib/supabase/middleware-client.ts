import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnvOrNull } from "@/lib/supabase/env";

export function createSupabaseMiddlewareClient(request: NextRequest) {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}
