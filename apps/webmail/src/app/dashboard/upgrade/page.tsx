import { Check, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const plans = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    period: "/mês",
    description: "Para começar",
    isCurrent: true,
    cta: "Plano atual",
    ctaDisabled: true,
    highlight: false,
    features: [
      "Sem cartão de crédito",
      "3 inboxes",
      "3.000 emails/mês",
      "1 domínio personalizado",
      "3 GB de storage",
    ],
  },
  {
    slug: "developer",
    name: "Developer",
    price: "$20",
    period: "/mês",
    description: "Para desenvolvedores",
    isCurrent: false,
    cta: "Upgrade para Developer",
    ctaDisabled: false,
    highlight: false,
    features: [
      "10 inboxes",
      "10.000 emails/mês",
      "10 GB de storage",
      "10 domínios personalizados",
      "Suporte por email",
    ],
  },
  {
    slug: "startup",
    name: "Startup",
    price: "$200",
    period: "/mês",
    description: "Para equipes em escala",
    isCurrent: false,
    cta: "Upgrade para Startup",
    ctaDisabled: false,
    highlight: true,
    features: [
      "150 inboxes",
      "150.000 emails/mês",
      "150 GB de storage",
      "150 domínios personalizados",
      "IPs dedicados",
      "Relatório SOC 2",
      "Suporte via Slack",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Para soluções sob medida",
    isCurrent: false,
    cta: "Falar com vendas",
    ctaDisabled: false,
    highlight: false,
    features: [
      "Tudo do Startup",
      "Descontos em volume",
      "Plataforma white-label",
      "Preço por uso",
      "Cloud na região UE",
      "BYO cloud deployment",
      "OIDC/SAML SSO",
    ],
  },
] as const;

export default function UpgradePage() {
  return (
    <DashboardShell title="Upgrade do Plano" subtitle="Escolha o plano que melhor atende às suas necessidades">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.slug}
            className={`relative flex flex-col rounded-xl border p-6 ${
              plan.highlight
                ? "border-neutral-900 bg-neutral-950 text-white dark:border-white dark:bg-neutral-900"
                : "border-neutral-200 bg-white dark:border-hub-border dark:bg-[#141414]"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-950">
                Popular
              </span>
            )}

            {plan.isCurrent && (
              <span className="absolute right-4 top-4 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Atual
              </span>
            )}

            <div className="mb-4">
              <h2
                className={`text-sm font-semibold uppercase tracking-wide ${
                  plan.highlight ? "text-neutral-300" : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {plan.name}
              </h2>
              <p
                className={`mt-1 text-xs ${
                  plan.highlight ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                {plan.description}
              </p>
            </div>

            <div className="mb-6 flex items-end gap-1">
              <span
                className={`text-4xl font-bold tracking-tight ${
                  plan.highlight ? "text-white" : "text-neutral-900 dark:text-white"
                }`}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span
                  className={`mb-1 text-sm ${
                    plan.highlight ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {plan.period}
                </span>
              )}
            </div>

            <ul className="mb-8 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 size-4 shrink-0 ${
                      plan.highlight ? "text-white" : "text-neutral-900 dark:text-white"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      plan.highlight ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {plan.ctaDisabled ? (
              <div
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                  plan.highlight
                    ? "border-white/20 text-white/60"
                    : "border-neutral-200 text-neutral-400 dark:border-hub-border dark:text-neutral-500"
                }`}
              >
                <Check className="size-4" />
                {plan.cta}
              </div>
            ) : plan.slug === "enterprise" ? (
              <a
                href="mailto:sales@hubmail.to"
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    : "border-neutral-200 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 dark:border-hub-border dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-white/5"
                }`}
              >
                {plan.cta}
              </a>
            ) : (
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "bg-white text-neutral-950 hover:bg-neutral-100"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 dark:border-hub-border dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-white/5"
                }`}
              >
                <Zap className="size-4" />
                {plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-neutral-200 p-6 dark:border-hub-border">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">
          Todos os planos incluem
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Integração com Stalwart (JMAP/SMTP/IMAP)",
            "Webhooks ilimitados",
            "API REST completa",
            "Suporte a múltiplos workspaces",
            "Dashboard em tempo real",
            "Criptografia AES-256-GCM",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Check className="size-4 shrink-0 text-emerald-500" />
              {feat}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-500">
        Precisa de algo diferente?{" "}
        <a href="mailto:sales@hubmail.to" className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
          Fale com nossa equipe
        </a>
      </p>
    </DashboardShell>
  );
}
