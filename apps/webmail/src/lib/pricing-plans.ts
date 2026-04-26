export type HomePricingPlanSummary = {
  name: string;
  price: string;
  features: string[];
  highlight: boolean;
};

export type PricingPlanDetail = {
  name: string;
  price: string;
  /** Subtítulo curto sob o preço (ex.: período). */
  periodLabel: string;
  tagline: string;
  highlight: boolean;
  bullets: readonly string[];
  ctaLabel: string;
  ctaHref: string;
};

export const pricingPlansDetail: readonly PricingPlanDetail[] = [
  {
    name: "Free",
    price: "$0",
    periodLabel: "/mês",
    tagline: "Para começar. Sem cartão de crédito.",
    highlight: false,
    bullets: [
      "3 inboxes",
      "3.000 emails/mês",
      "100 emails/dia",
      "3 GB de armazenamento",
      "2 pods de inbox",
      "2 endpoints de webhook",
      "2 membros de equipa",
    ],
    ctaLabel: "Começar",
    ctaHref: "/login",
  },
  {
    name: "Developer",
    price: "$20",
    periodLabel: "/mês",
    tagline: "Para programadores individuais.",
    highlight: false,
    bullets: [
      "10 inboxes",
      "10.000 emails/mês",
      "Sem limite diário de envio",
      "10 GB de armazenamento",
      "10 domínios personalizados",
      "2 pods de inbox",
      "2 endpoints de webhook",
      "2 membros de equipa",
      "Suporte por email",
    ],
    ctaLabel: "Começar",
    ctaHref: "/login",
  },
  {
    name: "Startup",
    price: "$200",
    periodLabel: "/mês",
    tagline: "Para equipas em escala.",
    highlight: true,
    bullets: [
      "150 inboxes",
      "150.000 emails/mês",
      "Sem limite diário de envio",
      "150 GB de armazenamento",
      "150 domínios personalizados",
      "10 pods de inbox",
      "10 endpoints de webhook",
      "10 membros de equipa",
      "IPs dedicados",
      "Relatório SOC 2",
      "Suporte por Slack",
    ],
    ctaLabel: "Começar",
    ctaHref: "/login",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    periodLabel: "",
    tagline: "Soluções à medida.",
    highlight: false,
    bullets: [
      "Tudo do plano Startup",
      "Descontos por volume",
      "Plataforma white-label",
      "Preço por uso",
      "Região cloud na UE",
      "Implementação BYO cloud",
      "SSO OIDC/SAML",
    ],
    ctaLabel: "Agendar conversa",
    ctaHref: "/enterprise",
  },
] as const;

/** Resumo para a grelha compacta na home. */
export const homePricingPlanSummaries: readonly HomePricingPlanSummary[] = pricingPlansDetail.map((p) => ({
  name: p.name,
  price: p.price === "Sob consulta" ? "Custom" : p.price,
  highlight: p.highlight,
  features: p.bullets.slice(0, 4),
}));

export type ComparisonCell = boolean | string;

export type ComparisonRow = {
  feature: string;
  free: ComparisonCell;
  developer: ComparisonCell;
  startup: ComparisonCell;
  enterprise: ComparisonCell;
};

export type ComparisonSection = {
  title: string;
  rows: readonly ComparisonRow[];
};

export const pricingComparisonSections: readonly ComparisonSection[] = [
  {
    title: "Core",
    rows: [
      { feature: "Inboxes", free: "3", developer: "10", startup: "150", enterprise: "Custom" },
      { feature: "Emails/mês", free: "3.000", developer: "10.000", startup: "150.000", enterprise: "Custom" },
      { feature: "Emails/dia", free: "100", developer: "Sem limite", startup: "Sem limite", enterprise: "Sem limite" },
      { feature: "Armazenamento (GB)", free: "3", developer: "10", startup: "150", enterprise: "Custom" },
      { feature: "Threads", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Etiquetas", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Anexos", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Rascunhos", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Envio agendado", free: true, developer: true, startup: true, enterprise: true },
      { feature: "SDKs", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Servidor MCP", free: true, developer: true, startup: true, enterprise: true },
    ],
  },
  {
    title: "Avançado",
    rows: [
      { feature: "Pods de inbox", free: "2", developer: "2", startup: "10", enterprise: "Custom" },
      { feature: "Endpoints de webhook", free: "2", developer: "2", startup: "10", enterprise: "Custom" },
      { feature: "Websockets", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Métricas", free: true, developer: true, startup: true, enterprise: true },
      { feature: "SMTP relay", free: true, developer: true, startup: true, enterprise: true },
      { feature: "White-label", free: false, developer: false, startup: false, enterprise: true },
      { feature: "Cloud UE", free: false, developer: false, startup: false, enterprise: true },
      { feature: "BYO cloud", free: false, developer: false, startup: false, enterprise: true },
    ],
  },
  {
    title: "Entregabilidade",
    rows: [
      { feature: "Domínios personalizados", free: false, developer: "10", startup: "150", enterprise: "Custom" },
      { feature: "DKIM, SPF, DMARC", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Lista de supressão", free: true, developer: true, startup: true, enterprise: true },
      { feature: "IPs partilhados otimizados", free: true, developer: true, startup: true, enterprise: true },
      { feature: "IPs dedicados", free: false, developer: false, startup: "Contactar", enterprise: "Contactar" },
    ],
  },
  {
    title: "Segurança",
    rows: [
      { feature: "Membros de equipa", free: "2", developer: "2", startup: "10", enterprise: "Custom" },
      { feature: "SSO social", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Autenticação multifator", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Webhooks assinados", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Relatório SOC 2", free: false, developer: false, startup: true, enterprise: true },
      { feature: "SSO OIDC/SAML", free: false, developer: false, startup: false, enterprise: true },
    ],
  },
  {
    title: "Suporte",
    rows: [
      { feature: "Comunidade Discord", free: true, developer: true, startup: true, enterprise: true },
      { feature: "Email", free: false, developer: true, startup: true, enterprise: true },
      { feature: "Canal Slack", free: false, developer: false, startup: true, enterprise: true },
    ],
  },
] as const;
