export function getSupabaseEnvOrNull(): { url: string; anonKey: string } | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL
  )?.trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_STORAGE_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvOrNull() !== null;
}

export function getSupabaseEnv() {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    throw new Error(
      "Missing Supabase public env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_STORAGE_SUPABASE_URL and anon or publishable key).",
    );
  }
  return env;
}
