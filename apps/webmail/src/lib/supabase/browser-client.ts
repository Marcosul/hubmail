"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvOrNull } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in webmail env.",
    );
  }

  return createBrowserClient(env.url, env.anonKey);
}
