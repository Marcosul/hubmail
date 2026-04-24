"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useCreateMailbox } from "@/hooks/use-mail";

const DEFAULT_DOMAIN = "hubmail.to";

export default function CreateInboxPage() {
  const router = useRouter();
  const create = useCreateMailbox();
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Insira a app password da conta Stalwart.");
      return;
    }
    const local = username.trim() || `inbox-${Math.random().toString(36).slice(2, 8)}`;
    const address = `${local}@${domain}`;
    try {
      const created = await create.mutateAsync({
        address,
        password,
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
      });
      router.push(`/dashboard/inboxes/${encodeURIComponent(created.id)}/inbox`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar mailbox");
    }
  }

  const submitting = create.isPending;

  return (
    <DashboardShell title="Create inbox" subtitle="Create a new email inbox for your workspace.">
      <div className="mx-auto max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-hub-border dark:bg-[#141414]">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Username (optional)
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sales"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-neutral-400 focus:ring-2 dark:border-hub-border dark:bg-hub-surface dark:text-white"
            />
            <p className="mt-1 flex items-start gap-1 text-xs text-neutral-500">
              Username will be auto-generated if not specified.
            </p>
          </div>
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Domain
            </label>
            <select
              id="domain"
              name="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            >
              <option value="hubmail.to">hubmail.to (default)</option>
            </select>
          </div>
          <div>
            <label htmlFor="display" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Display name (optional)
            </label>
            <input
              id="display"
              name="display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sales team"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              App password (Stalwart)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="gerada no Account Manager do Stalwart"
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-neutral-500">
              Guardada cifrada (AES-256-GCM) nunca mais exibida.
            </p>
          </div>
          {error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard/inboxes"
              className="flex-1 rounded-md border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {submitting ? "A criar…" : "+ Create inbox"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
