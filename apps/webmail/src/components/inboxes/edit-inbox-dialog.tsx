"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useMailboxDetails, useUpdateMailbox } from "@/hooks/use-mail";
import type { UpdateMailboxInput } from "@hubmail/types";

type Tab = "general" | "aliases" | "quotas" | "advanced";

interface Props {
  mailboxId: string;
  address: string;
  onClose: () => void;
}

export function EditInboxDialog({ mailboxId, address, onClose }: Props) {
  const { messages } = useI18n();
  const copy = messages.inboxes;
  const { data, isLoading, isError } = useMailboxDetails(mailboxId);
  const update = useUpdateMailbox();

  const [tab, setTab] = useState<Tab>("general");
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [locale, setLocale] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [quotaBytes, setQuotaBytes] = useState<string>("");
  const [encryptionAtRest, setEncryptionAtRest] = useState(false);
  const [roles, setRoles] = useState("");
  const [permissions, setPermissions] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.displayName ?? "");
    setFullName(data.fullName ?? "");
    setAliases(data.aliases ?? []);
    setLocale(data.locale ?? "");
    setTimeZone(data.timeZone ?? "");
    setQuotaBytes(data.quotaBytes ? String(data.quotaBytes) : "");
    setEncryptionAtRest(Boolean(data.encryptionAtRest));
    setRoles((data.roles ?? []).join(", "));
    setPermissions((data.permissions ?? []).join(", "));
    setActive(data.active ?? true);
  }, [data]);

  const aliasInvalid = useMemo(() => {
    const v = aliasInput.trim().toLowerCase();
    if (!v) return false;
    if (v === address.toLowerCase()) return true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
    return aliases.includes(v);
  }, [aliasInput, aliases, address]);

  function addAlias() {
    const v = aliasInput.trim().toLowerCase();
    if (!v || aliasInvalid) return;
    setAliases((prev) => [...prev, v]);
    setAliasInput("");
  }

  function removeAlias(value: string) {
    setAliases((prev) => prev.filter((a) => a !== value));
  }

  async function submit() {
    setError(null);
    const payload: UpdateMailboxInput = {
      displayName,
      fullName,
      aliases,
      locale,
      timeZone,
      quotaBytes: quotaBytes ? Number(quotaBytes) : 0,
      encryptionAtRest,
      roles: roles.split(",").map((s) => s.trim()).filter(Boolean),
      permissions: permissions.split(",").map((s) => s.trim()).filter(Boolean),
      active,
    };
    try {
      await update.mutateAsync({ mailboxId, ...payload });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.saveError);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "general", label: copy.tabGeneral },
    { id: "aliases", label: copy.tabAliases },
    { id: "quotas", label: copy.tabQuotas },
    { id: "advanced", label: copy.tabAdvanced },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-hub-border">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{copy.editInbox}</h3>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{address}</p>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{copy.editInboxSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label={messages.common.cancel}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-neutral-200 px-5 dark:border-hub-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-neutral-500">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : isError || !data ? (
            <p className="py-10 text-center text-sm text-red-600">{copy.loadError}</p>
          ) : tab === "general" ? (
            <div className="space-y-4">
              <Field label={copy.displayName}>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.fullName}>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={copy.fullNamePlaceholder}
                  className={inputCls}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span className="text-neutral-700 dark:text-neutral-300">{copy.activeAccount}</span>
              </label>
            </div>
          ) : tab === "aliases" ? (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{copy.aliasesHelp}</p>
              <div className="flex gap-2">
                <input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAlias();
                    }
                  }}
                  placeholder={copy.aliasesPlaceholder}
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={!aliasInput.trim() || aliasInvalid}
                  onClick={addAlias}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  {copy.aliasAdd}
                </button>
              </div>
              <ul className="space-y-1">
                {aliases.length === 0 ? (
                  <li className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-center text-xs text-neutral-500 dark:border-hub-border">
                    —
                  </li>
                ) : (
                  aliases.map((a) => (
                    <li
                      key={a}
                      className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-hub-border"
                    >
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">{a}</span>
                      <button
                        type="button"
                        onClick={() => removeAlias(a)}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        {copy.aliasRemove}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : tab === "quotas" ? (
            <div className="space-y-4">
              <Field label={copy.quotaLabel} hint={copy.quotaHelp}>
                <input
                  type="number"
                  min={0}
                  value={quotaBytes}
                  onChange={(e) => setQuotaBytes(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.localeLabel}>
                <input
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  placeholder="pt-BR"
                  className={inputCls}
                />
              </Field>
              <Field label={copy.timeZoneLabel}>
                <input
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  placeholder="America/Sao_Paulo"
                  className={inputCls}
                />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={encryptionAtRest}
                  onChange={(e) => setEncryptionAtRest(e.target.checked)}
                />
                <span className="text-neutral-700 dark:text-neutral-300">{copy.encryptionAtRest}</span>
              </label>
              <Field label={copy.rolesLabel}>
                <input
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  placeholder={copy.rolesPlaceholder}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.permissionsLabel}>
                <input
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value)}
                  placeholder={copy.permissionsPlaceholder}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-5 py-3 dark:border-hub-border">
          <div className="text-xs">
            {error ? (
              <span className="text-red-600 dark:text-red-400">{error}</span>
            ) : savedFlash ? (
              <span className="text-emerald-600 dark:text-emerald-400">{copy.savedOk}</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-300 dark:hover:bg-white/5"
            >
              {messages.common.cancel}
            </button>
            <button
              type="button"
              disabled={isLoading || update.isPending}
              onClick={submit}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {update.isPending ? copy.savingCredential : messages.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</span> : null}
    </label>
  );
}
