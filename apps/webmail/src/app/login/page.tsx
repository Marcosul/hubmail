"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { buildOAuthCallbackRedirectTo } from "@/lib/oauth-app-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const { messages } = useI18n();
  const copy = messages.login;
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const OAuthNextCookieName = "hubmail_oauth_next";

  async function onGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      document.cookie = `${OAuthNextCookieName}=${encodeURIComponent(next)};path=/;max-age=900;SameSite=Lax`;
      const redirectTo = buildOAuthCallbackRedirectTo();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (signInError) {
        setError(mapGoogleOAuthError(signInError.message, copy.googleProviderInactive));
        return;
      }
    } catch {
      setError(copy.startError);
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-md rounded-xl border border-red-400/30 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">{copy.supabaseTitle}</h1>
            <p className="mt-2 text-sm text-neutral-300">
              {copy.supabaseDescription}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-neutral-400 hover:text-white">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white text-neutral-950">
              <Mail className="size-4" aria-hidden />
            </div>
            <span className="font-semibold">HubMail</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-neutral-400">{copy.subtitle}</p>

          <div className="mt-8 space-y-5">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-white py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-60"
            >
              <GoogleIcon />
              {loading ? copy.connecting : copy.continueWithGoogle}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapGoogleOAuthError(message: string, providerInactiveMessage: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("not enabled") ||
    lower.includes("unsupported provider") ||
    lower.includes("validation_failed")
  ) {
    return providerInactiveMessage;
  }

  return message;
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.3H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.7z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.3 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.3H42V20H24v8h11.3c-1 2.9-3 5.2-5.8 6.8l.1.1 6.2 5.2C35.4 40.2 44 34 44 24c0-1.3-.1-2.5-.4-3.7z"
      />
    </svg>
  );
}
