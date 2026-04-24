"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvOrNull } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and anon key (or NEXT_PUBLIC_STORAGE_* from Vercel) in webmail env.",
    );
  }

  return createBrowserClient(env.url, env.anonKey);
}
