"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import {
  useMailboxDetails,
  useRegenerateMailboxCredential,
  useRevealMailboxCredential,
  useUpdateMailbox,
} from "@/hooks/use-mail";
import type { MailboxDetails, UpdateMailboxInput } from "@hubmail/types";

type Tab = "general" | "aliases" | "quotas" | "credentials" | "advanced";

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

  const initialRef = useRef<MailboxDetails | null>(null);

  useEffect(() => {
    if (!data) return;
    initialRef.current = data;
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

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

  function buildDiff(): UpdateMailboxInput | null {
    const init = initialRef.current;
    if (!init) return null;
    const diff: UpdateMailboxInput = {};

    const dn = displayName.trim();
    if (dn !== (init.displayName ?? "")) diff.displayName = dn;

    const fn = fullName.trim();
    if (fn !== (init.fullName ?? "")) diff.fullName = fn;

    const initAliases = (init.aliases ?? []).slice().sort().join("|");
    const cur = aliases.slice().sort().join("|");
    if (initAliases !== cur) diff.aliases = aliases;

    const lc = locale.trim();
    if (lc !== (init.locale ?? "")) diff.locale = lc;

    const tz = timeZone.trim();
    if (tz !== (init.timeZone ?? "")) diff.timeZone = tz;

    const qb = quotaBytes ? Number(quotaBytes) : 0;
    const initQb = init.quotaBytes ?? 0;
    if (qb !== initQb) diff.quotaBytes = qb;

    if (encryptionAtRest !== Boolean(init.encryptionAtRest)) {
      diff.encryptionAtRest = encryptionAtRest;
    }

    const rolesArr = roles.split(",").map((s) => s.trim()).filter(Boolean);
    if (rolesArr.join("|") !== (init.roles ?? []).join("|")) diff.roles = rolesArr;

    const permsArr = permissions.split(",").map((s) => s.trim()).filter(Boolean);
    if (permsArr.join("|") !== (init.permissions ?? []).join("|")) diff.permissions = permsArr;

    if (active !== Boolean(init.active)) diff.active = active;

    return Object.keys(diff).length > 0 ? diff : null;
  }

  async function submit() {
    setError(null);
    const diff = buildDiff();
    if (!diff) {
      onClose();
      return;
    }
    try {
      await update.mutateAsync({ mailboxId, ...diff });
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
    { id: "credentials", label: copy.tabCredentials },
    { id: "advanced", label: copy.tabAdvanced },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-inbox-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111] sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3 dark:border-hub-border sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h3
              id="edit-inbox-title"
              className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {copy.editInbox}
            </h3>
            <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">{address}</p>
            <p className="mt-0.5 hidden text-xs text-neutral-400 sm:block dark:text-neutral-500">
              {copy.editInboxSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label={messages.common.cancel}
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-2 sm:px-5 dark:border-hub-border"
          role="tablist"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAlias();
                    }
                  }}
                  aria-invalid={aliasInvalid}
                  placeholder={copy.aliasesPlaceholder}
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={!aliasInput.trim() || aliasInvalid}
                  onClick={addAlias}
                  className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
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
                      className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-hub-border"
                    >
                      <span className="truncate font-mono text-neutral-800 dark:text-neutral-200">{a}</span>
                      <button
                        type="button"
                        onClick={() => removeAlias(a)}
                        className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        {copy.aliasRemove}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : tab === "credentials" ? (
            <CredentialsTab mailboxId={mailboxId} address={address} />
          ) : tab === "quotas" ? (
            <div className="space-y-4">
              <Field label={copy.quotaLabel} hint={copy.quotaHelp}>
                <input
                  type="number"
                  inputMode="numeric"
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-3 sm:px-5 dark:border-hub-border">
          <div className="order-2 w-full text-xs sm:order-1 sm:w-auto">
            {error ? (
              <span className="text-red-600 dark:text-red-400">{error}</span>
            ) : savedFlash ? (
              <span className="text-emerald-600 dark:text-emerald-400">{copy.savedOk}</span>
            ) : null}
          </div>
          <div className="order-1 ml-auto flex shrink-0 gap-2 sm:order-2">
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

function CredentialsTab({ mailboxId, address }: { mailboxId: string; address: string }) {
  const [revealed, setRevealed] = useState(false);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = useRevealMailboxCredential(mailboxId, revealed);
  const regen = useRegenerateMailboxCredential();

  const password = reveal.data?.password ?? "";
  const username = reveal.data?.username ?? address;

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function regenerate() {
    setError(null);
    setConfirming(false);
    try {
      const out = await regen.mutateAsync({ mailboxId });
      // Atualiza visivelmente
      setShow(true);
      // O hook invalida e o reveal-query faz refetch
      await reveal.refetch();
      // failsafe: se o user não tinha revelado ainda, mostra a senha gerada
      if (!revealed) {
        setRevealed(true);
      }
      // O servidor já devolve a nova senha, então força exibição mesmo sem refetch
      void out;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar nova senha");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>Importante:</strong> esta é a app-password gerada pelo Stalwart para esta conta.
        Use-a em clientes IMAP/SMTP ou nas notificações transacionais (variável <code>NOTIFICATION_SMTP_PASS</code>).
        Ao gerar uma nova, atualize onde estiver em uso.
      </div>

      <Field label="Utilizador">
        <input value={username} readOnly className={inputCls + " font-mono"} />
      </Field>

      <Field label="Senha">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              value={revealed ? password : "•••••••••••••••••••••"}
              readOnly
              className={inputCls + " pr-10 font-mono"}
            />
            <button
              type="button"
              onClick={() => {
                if (!revealed) setRevealed(true);
                setShow((s) => !s);
              }}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              aria-label={show ? "Ocultar" : "Mostrar"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!revealed || !password}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </Field>

      {reveal.isLoading && revealed && (
        <p className="text-xs text-neutral-500">A obter senha…</p>
      )}
      {reveal.isError && (
        <p className="text-xs text-red-600">
          {(reveal.error as Error)?.message ?? "Falha ao obter senha"}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-hub-border">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Gerar nova senha cria uma nova app-password no Stalwart e substitui a guardada.
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={regen.isPending}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
          >
            <RefreshCw className="size-4" /> Gerar nova senha
          </button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={regen.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {regen.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
