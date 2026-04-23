"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { apiRequest } from "@/api/rest/generic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard/overview";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-neutral-400">Use any email and password for the demo session.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/40 placeholder:text-neutral-600 focus:ring-2"
                placeholder="you@hubmail.to"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/40 placeholder:text-neutral-600 focus:ring-2"
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-white py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
