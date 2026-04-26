import type { LucideIcon } from "lucide-react";
import { Bot, Globe, Inbox, KeyRound, Plug2, Webhook } from "lucide-react";

export const homeHeroCodeSnippet = `import hubmail from "@hubmail/sdk";

const client = new hubmail.Client({
  apiKey: process.env.HUBMAIL_API_KEY,
});

// Enviar email transacional
await client.inboxes.send({
  from: "agent@meuapp.com",
  to: "usuario@exemplo.com",
  subject: "Bem-vindo!",
  html: "<h1>Olá, mundo!</h1>",
});

// Receber via webhook
client.on("mail.received", async (email) => {
  const reply = await ai.generateReply(email.body);
  await email.reply({ html: reply });
});`;

export type HomeFeatureCard = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const homeFeatureCards: readonly HomeFeatureCard[] = [
  {
    icon: Inbox,
    title: "Inboxes programáticas",
    body: "Crie e gerencie inboxes via API. Cada inbox tem credenciais SMTP/IMAP para integração com qualquer serviço.",
  },
  {
    icon: Webhook,
    title: "Webhooks em tempo real",
    body: "Receba eventos de email instantaneamente. Assine MAIL_RECEIVED, MAIL_SENT e MAIL_BOUNCED com HMAC assinado.",
  },
  {
    icon: Globe,
    title: "Domínios personalizados",
    body: "Envie email a partir do seu próprio domínio com verificação automática de DNS e SPF/DKIM/DMARC.",
  },
  {
    icon: Bot,
    title: "Agentes de IA",
    body: "Conecte modelos de linguagem para ler, classificar e responder emails automaticamente via AI SDK.",
  },
  {
    icon: KeyRound,
    title: "API Keys com escopos",
    body: "Chaves de API com escopos granulares para integração segura. Revogue sem interromper outros serviços.",
  },
  {
    icon: Plug2,
    title: "MCP",
    body: "Exponha inboxes, domínios e webhooks a assistentes e agentes via Model Context Protocol — ferramentas tipadas e descoberta padronizada.",
  },
];

/** Primeiras 4 entradas: mesmos títulos e textos do hero (grid 2×2 ao lado do código). */
export const homeHeroHighlightCards = homeFeatureCards.slice(0, 4).map((f) => ({ title: f.title, body: f.body }));

export type { HomePricingPlanSummary as HomePricingPlan } from "@/lib/pricing-plans";
export { homePricingPlanSummaries as homePricingPlans } from "@/lib/pricing-plans";
