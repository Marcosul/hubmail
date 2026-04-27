"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, CircleHelp, Clock3, Copy, X } from "lucide-react";
import {
  useCreateDomain,
  useDomainSetup,
  useVerifyDomain,
  type DnsSetupRow,
} from "@/hooks/use-domains";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type WizardCopy = {
  titleNew: string;
  titleConfigure: string;
  close: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
  domainLabel: string;
  domainPlaceholder: string;
  requiredDomain: string;
  aliasesLabel: string;
  aliasesPlaceholder: string;
  aliasesHelp: string;
  next: string;
  back: string;
  validate: string;
  finish: string;
  step2Description: string;
  suggestedSender: string;
  dnsIntro: string;
  dnsSteps: readonly string[];
  stalwartMgmtOff: string;
  zoneRaw: string;
  copy: string;
  copied: string;
  colStatus: string;
  colType: string;
  colPriority: string;
  colHost: string;
  colValue: string;
  verificationPending: string;
  verificationOk: string;
  openDocs: string;
  addWizardCta: string;
  configureCta: string;
  summaryLine: string;
  summaryPending: string;
  stalwartPartial: string;
  stalwartProvisionNote: string;
  stalwartQueuedNote: string;
};

export type DomainSetupWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "configure";
  existingDomainId: string | null;
  existingDomainName?: string | null;
  copy: WizardCopy;
};

function CopyField({
  value,
  label,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p
          className="mt-0.5 truncate font-mono text-xs text-neutral-900 dark:text-neutral-100"
          title={value}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-hub-border dark:hover:bg-white/5"
        title={done ? copiedLabel : copyLabel}
        aria-label={copyLabel}
      >
        {done ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

export function DomainSetupWizard({
  open,
  onOpenChange,
  mode,
  existingDomainId,
  existingDomainName,
  copy,
}: DomainSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [domainName, setDomainName] = useState("");
  const [aliasesInput, setAliasesInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [recordStatus, setRecordStatus] = useState<Record<string, "pending" | "verified">>({});

  const create = useCreateDomain();
  const verify = useVerifyDomain();
  const setupEnabled = open && Boolean(domainId) && step >= 2;
  const { data: setup, isLoading: setupLoading, refetch: refetchSetup } = useDomainSetup(
    domainId,
    setupEnabled,
  );

  useEffect(() => {
    if (!open || !domainId || !setup?.domain.status) return;
    setVerifySuccess(setup.domain.status === "VERIFIED");
  }, [open, domainId, setup?.domain.status]);

  useEffect(() => {
    if (!open || step !== 2 || !setup?.domain?.name || !setup?.records?.length) return;
    let cancelled = false;

    const normalizeTxt = (value: string) =>
      value.trim().replace(/"/g, "").replace(/\s+/g, " ").toLowerCase();

    const fqdn = (host: string) => {
      const h = host.trim().replace(/\.$/, "");
      if (h === "@" || h === "") return setup.domain.name;
      if (h === setup.domain.name || h.endsWith(`.${setup.domain.name}`)) return h;
      return `${h}.${setup.domain.name}`;
    };

    const checkRecord = async (row: DnsSetupRow): Promise<"pending" | "verified"> => {
      try {
        const type = row.type.toUpperCase();
        const name = fqdn(row.host);
        const res = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&random=${Date.now()}`,
        );
        if (!res.ok) return "pending";
        const json = (await res.json()) as { Answer?: { data?: string }[] };
        const answers = (json.Answer ?? []).map((a) => a.data ?? "").filter(Boolean);
        if (!answers.length) return "pending";

        if (type === "MX") {
          const expectedHost = row.value.trim().replace(/\.$/, "").toLowerCase();
          const expectedPrio = String(row.priority ?? 10);
          return answers.some((a) => {
            const m = a.trim().match(/^(\d+)\s+(.+)$/);
            if (!m) return false;
            const [, prio, host] = m;
            return prio === expectedPrio && host.replace(/\.$/, "").toLowerCase() === expectedHost;
          })
            ? "verified"
            : "pending";
        }

        if (type === "TXT") {
          const expected = normalizeTxt(row.value);
          return answers.some((a) => normalizeTxt(a).includes(expected)) ? "verified" : "pending";
        }

        const expected = row.value.trim().replace(/\.$/, "").toLowerCase();
        return answers.some((a) => a.trim().replace(/\.$/, "").toLowerCase() === expected)
          ? "verified"
          : "pending";
      } catch {
        return "pending";
      }
    };

    (async () => {
      const pairs = await Promise.all(
        setup.records.map(async (row) => [row.id, await checkRecord(row)] as const),
      );
      if (cancelled) return;
      setRecordStatus(Object.fromEntries(pairs));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, step, setup?.domain?.name, setup?.records]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setSyncWarning(null);
    setVerifyHint(null);
    setVerifySuccess(false);
    if (mode === "configure" && existingDomainId) {
      setDomainId(existingDomainId);
      setDomainName(existingDomainName ?? "");
      setStep(2);
      return;
    }
    setDomainId(null);
    setDomainName("");
    setAliasesInput("");
    setStep(0);
  }, [open, mode, existingDomainId, existingDomainName]);

  const title = useMemo(
    () =>
      mode === "configure"
        ? `${copy.titleConfigure}${domainName ? ` — ${domainName}` : ""}`
        : copy.titleNew,
    [copy.titleConfigure, copy.titleNew, domainName, mode],
  );

  const currentStepTitle = useMemo(() => {
    switch (step) {
      case 0:
        return copy.step1Title;
      case 1:
        return copy.step2Title;
      case 2:
        return copy.step3Title;
      case 3:
      default:
        return copy.step4Title;
    }
  }, [copy.step1Title, copy.step2Title, copy.step3Title, copy.step4Title, step]);

  function parseAliases(raw: string): string[] {
    return raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  async function submitStep0() {
    setFormError(null);
    const name = domainName.trim().toLowerCase();
    if (!name) {
      setFormError(copy.requiredDomain);
      return;
    }
    try {
      const aliases = parseAliases(aliasesInput);
      const res = await create.mutateAsync({ name, aliases: aliases.length ? aliases : undefined });
      setDomainId(res.id);
      setDomainName(res.name);
      if (res.stalwart?.queued) {
        setSyncWarning(copy.stalwartQueuedNote);
      } else if (res.stalwart && !res.stalwart.synced) {
        setSyncWarning(
          res.stalwart.detail
            ? `${copy.stalwartPartial}: ${res.stalwart.detail}`
            : copy.stalwartProvisionNote,
        );
      } else {
        setSyncWarning(null);
      }
      setStep(1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro");
    }
  }

  async function runVerify() {
    if (!domainId) return;
    setVerifyHint(null);
    try {
      const res = await verify.mutateAsync(domainId);
      await refetchSetup();
      if (res.status === "VERIFIED") {
        setVerifySuccess(true);
        setStep(3);
        setVerifyHint(null);
      } else {
        setVerifyHint(copy.verificationPending);
      }
    } catch (e) {
      setVerifyHint(e instanceof Error ? e.message : "Erro");
    }
  }

  if (!open) return null;

  const records: DnsSetupRow[] = setup?.records ?? [];
  const resolveTxtSubtype = (row: DnsSetupRow): string | null => {
    if (row.type.toUpperCase() !== "TXT") return row.label || null;
    const host = row.host.toLowerCase();
    const value = row.value.toLowerCase();

    if (host === "_hubmail" || value.includes("hubmail-verification=")) return "HubMail";
    if (host.includes("_domainkey") || value.includes("v=dkim1")) {
      if (value.includes("k=ed25519")) return "DKIM (ed25519)";
      if (value.includes("k=rsa")) return "DKIM (rsa)";
      return "DKIM";
    }
    if (host.includes("_dmarc") || value.includes("v=dmarc1")) return "DMARC";
    if (value.includes("v=spf1")) return "SPF";
    if (row.label && row.label.trim().length > 0) return row.label;
    return "TXT";
  };
  const resolveRecordTooltip = (row: DnsSetupRow): string => {
    const type = row.type.toUpperCase();
    if (type === "MX") {
      return "MX: define o servidor que recebe emails do domínio.";
    }
    if (type !== "TXT") {
      return `${type}: registro DNS usado na configuração de email do domínio.`;
    }

    const subtype = resolveTxtSubtype(row);
    if (subtype === "HubMail") {
      return "HubMail: prova de propriedade do domínio para validação no HubMail.";
    }
    if (subtype === "SPF") {
      return "SPF: autoriza quais servidores podem enviar emails por este domínio.";
    }
    if (subtype?.startsWith("DKIM")) {
      return "DKIM: chave pública para validar a assinatura criptográfica dos emails enviados. Se houver dois registros DKIM (RSA e ED25519), publique ambos no DNS.";
    }
    if (subtype === "DMARC") {
      return "DMARC: política de tratamento para falhas de SPF/DKIM e relatórios.";
    }
    return "TXT: registro textual usado para validações e políticas de email.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-wizard-title"
        className="flex max-h-[min(100dvh,920px)] w-full max-w-[min(100%,72rem)] flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111] sm:max-h-[92vh] sm:rounded-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-hub-border sm:px-5">
          <div className="min-w-0">
            <h2 id="domain-wizard-title" className="truncate text-base font-semibold text-neutral-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {`${currentStepTitle} (${step + 1}/4)`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label={copy.close}
          >
            <X className="size-5" />
          </button>
        </header>

        {syncWarning && step >= 1 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100 sm:px-5">
            {syncWarning}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{copy.domainLabel}</label>
                <input
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder={copy.domainPlaceholder}
                  className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{copy.aliasesLabel}</label>
                <input
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  placeholder={copy.aliasesPlaceholder}
                  className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-hub-card dark:text-white"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-neutral-500">{copy.aliasesHelp}</p>
              </div>
              {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}
              {syncWarning ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">{syncWarning}</p>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              <p>{copy.step2Description}</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-hub-border dark:bg-hub-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.suggestedSender}</p>
                <p className="mt-1 font-mono text-neutral-900 dark:text-white">
                  {domainName ? `noreply@${domainName}` : "—"}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{copy.dnsIntro}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                {copy.dnsSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {setup?.stalwartError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {setup.stalwartError}
                </p>
              ) : null}
              {setupLoading ? (
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-hub-border">
                  <div className="min-w-[760px] p-3">
                    <div className="mb-3 grid grid-cols-5 gap-3">
                      <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="mb-2 grid grid-cols-5 gap-3">
                        <div className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/70" />
                        <div className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/70" />
                        <div className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/70" />
                        <div className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/70" />
                        <div className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/70" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-hub-border">
                  <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-hub-border dark:bg-[#141414]">
                        <th className="w-[76px] px-3 py-2 font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                          {copy.colStatus}
                        </th>
                        <th className="px-3 py-2 font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                          {copy.colType}
                        </th>
                        <th className="px-3 py-2 font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                          {copy.colPriority}
                        </th>
                        <th className="px-3 py-2 font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                          {copy.colHost}
                        </th>
                        <th className="px-3 py-2 font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                          {copy.colValue}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((row) => (
                        <tr key={row.id} className="border-b border-neutral-100 dark:border-hub-border">
                          <td className="px-3 py-2 align-top">
                            {recordStatus[row.id] === "verified" ? (
                              <span
                                className="inline-flex"
                                title="Registro verificado"
                                aria-label="Registro verificado"
                              >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex"
                                title="Registro pendente"
                                aria-label="Registro pendente"
                              >
                                <Clock3 className="size-4 text-amber-500" />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-neutral-800 dark:text-neutral-200">
                            <div className="font-medium">{row.type}</div>
                            {(row.label || row.type.toUpperCase() === "TXT") ? (
                              <div className="mt-1 flex max-w-[14rem] items-center gap-1 text-[10px] font-normal leading-snug text-neutral-500 dark:text-neutral-400 sm:max-w-[18rem]">
                                <span className="truncate">{resolveTxtSubtype(row)}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex shrink-0 items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                        aria-label={`Info sobre ${resolveTxtSubtype(row) ?? row.type}`}
                                      >
                                        <CircleHelp className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{resolveRecordTooltip(row)}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            ) : null}
                          </td>
                          <td className="w-[88px] px-3 py-2 align-top font-mono text-xs text-neutral-800 dark:text-neutral-200">
                            {row.type.toUpperCase() === "MX" ? String(row.priority ?? 10) : "—"}
                          </td>
                          <td className="max-w-[180px] px-3 py-2 align-top sm:max-w-[220px]">
                            <CopyField value={row.host} label={copy.colHost} copyLabel={copy.copy} copiedLabel={copy.copied} />
                          </td>
                          <td className="max-w-[340px] px-3 py-2 align-top sm:max-w-[460px]">
                            <CopyField value={row.value} label={copy.colValue} copyLabel={copy.copy} copiedLabel={copy.copied} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {verifyHint ? <p className="text-sm text-amber-700 dark:text-amber-300">{verifyHint}</p> : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              <p>{copy.summaryLine}</p>
              {verifySuccess || setup?.domain.status === "VERIFIED" ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {copy.verificationOk}
                </p>
              ) : (
                <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-800 dark:border-hub-border dark:bg-hub-card dark:text-neutral-200">
                  {copy.summaryPending}
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-neutral-200 px-4 py-3 dark:border-hub-border sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {copy.back}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {step === 0 ? (
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => void submitStep0()}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
              >
                {copy.next}
              </button>
            ) : null}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                {copy.next}
              </button>
            ) : null}
            {step === 2 ? (
              <>
                <button
                  type="button"
                  disabled={verify.isPending || !domainId}
                  onClick={() => void runVerify()}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {copy.validate}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-hub-border dark:text-neutral-200"
                >
                  {copy.next}
                </button>
              </>
            ) : null}
            {step === 3 ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                {copy.finish}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
