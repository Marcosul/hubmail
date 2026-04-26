"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useDomains } from "@/hooks/use-domains";
import { useCreateMailbox } from "@/hooks/use-mail";
import { useI18n } from "@/i18n/client";

export default function CreateInboxPage() {
  const { messages } = useI18n();
  const copy = messages.createInbox;
  const router = useRouter();
  const create = useCreateMailbox();
  const { data: domains, isLoading: domainsLoading, isError: domainsError } = useDomains();
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const domainDropdownRef = useRef<HTMLDivElement | null>(null);
  const domainOptions = useMemo(
    () => (domains ?? []).map((d) => d.name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [domains],
  );

  useEffect(() => {
    if ((!domain || !domainOptions.includes(domain)) && domainOptions.length > 0) {
      setDomain(domainOptions[0]);
    }
  }, [domain, domainOptions]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!domainDropdownRef.current) return;
      if (!domainDropdownRef.current.contains(event.target as Node)) {
        setDomainOpen(false);
      }
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setDomainOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!domain.trim()) {
      setError(copy.domainRequired);
      return;
    }
    const normalizedUsername = username.trim().toLowerCase().replace(/\s+/g, "");
    const local = normalizedUsername || `inbox-${Math.random().toString(36).slice(2, 8)}`;
    const address = `${local}@${domain}`;
    try {
      const created = await create.mutateAsync({
        address,
        displayName: displayName.trim() || undefined,
        username: normalizedUsername || undefined,
      });
      if (created.hasCredential) {
        router.push(`/dashboard/inboxes/${encodeURIComponent(created.id)}/inbox`);
      } else {
        router.push("/dashboard/inboxes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.createError);
    }
  }

  const submitting = create.isPending;

  return (
    <DashboardShell title={copy.title} subtitle={copy.subtitle}>
      <div className="mx-auto w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-hub-border dark:bg-[#141414] sm:p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {copy.username}
              </label>
              <input
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={copy.usernamePlaceholder}
                className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-neutral-400 focus:ring-2 dark:border-hub-border dark:bg-hub-surface dark:text-white"
              />
              <p className="mt-1 flex items-start gap-1 text-xs text-neutral-500">
                {copy.usernameHelp}
              </p>
            </div>
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {copy.domain}
              </label>
              <div ref={domainDropdownRef} className="relative mt-1.5">
                <button
                  type="button"
                  id="domain"
                  name="domain"
                  disabled={domainsLoading || domainOptions.length === 0}
                  onClick={() => setDomainOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-900 outline-none ring-neutral-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-hub-border dark:bg-hub-card dark:text-white"
                  aria-haspopup="listbox"
                  aria-expanded={domainOpen}
                >
                  <span className="truncate">
                    {domainsLoading
                      ? copy.loadingDomains
                      : domain || copy.noDomainsOption}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-500" />
                </button>
                {domainOpen && !domainsLoading && domainOptions.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-hub-border dark:bg-[#111]">
                    <ul role="listbox" aria-label={copy.domain} className="py-1">
                      {domainOptions.map((d) => {
                        const selected = d === domain;
                        return (
                          <li key={d}>
                            <button
                              type="button"
                              onClick={() => {
                                setDomain(d);
                                setDomainOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10"
                            >
                              <span className="truncate">{d}</span>
                              {selected ? <Check className="ml-2 size-4 text-emerald-600" /> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
              {domainsError ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{copy.loadDomainsError}</p>
              ) : null}
              {!domainsLoading && domainOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  {copy.noDomainsHelp}{" "}
                  <Link href="/dashboard/domains" className="underline">
                    {copy.openDomains}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="display" className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {copy.displayName}
            </label>
            <input
              id="display"
              name="display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.displayNamePlaceholder}
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-neutral-400 focus:ring-2 dark:border-hub-border dark:bg-hub-card dark:text-white"
            />
          </div>
          {error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/dashboard/inboxes"
              className="flex-1 rounded-md border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
            >
              {messages.common.cancel}
            </Link>
            <button
              type="submit"
              disabled={submitting || domainsLoading || domainOptions.length === 0}
              className="flex-1 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {submitting ? copy.creating : messages.inboxes.createInbox}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
