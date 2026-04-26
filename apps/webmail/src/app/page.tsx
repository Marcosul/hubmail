import Link from "next/link";
import { codeToHtml } from "shiki";
import { ArrowRight, Check, Plug2, Inbox, Globe, Webhook, KeyRound, Bot } from "lucide-react";
import { BlogPreviewCarousel } from "@/components/home/blog-preview-carousel";
import { getAllPosts } from "@/lib/blog";

const CODE_SNIPPET = `import hubmail from "@hubmail/sdk";

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

const features = [
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
] as const;

/** Primeiras 4 entradas de `features`: mesmos títulos e textos da secção Funcionalidades (layout 2×2 ao lado do código). */
const codeSideHighlightCards = features.slice(0, 4).map((f) => ({ title: f.title, body: f.body }));

export default async function HomePage() {
  const codeHtml = await codeToHtml(CODE_SNIPPET, {
    lang: "typescript",
    theme: "github-dark",
  });
  const blogPosts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white text-neutral-950">
              <Inbox className="size-4" aria-hidden />
            </div>
            <span className="text-base font-semibold tracking-tight">HubMail</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-neutral-400 sm:flex">
            <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Preços</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <a href="https://hubmail.to" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: cópia + código (substitui o hero centrado anterior) */}
        <section className="relative overflow-hidden border-b border-white/[0.06] bg-white/[0.02] px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
            <div className="mt-10 h-[420px] w-[min(100%,900px)] rounded-full bg-white/[0.03] blur-3xl sm:mt-16 sm:h-[500px]" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-stretch">
              <div className="flex h-full min-w-0 flex-col space-y-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Pronto para usar
                </div>

                <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Crie Email como identidade para seus{" "}
                  <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                    agentes de IA
                  </span>
                </h1>
                <p className="text-sm leading-snug text-neutral-400 sm:text-base sm:leading-relaxed">
                  Seu agente de IA precisa de uma caixa de entrada para se comunicar com o mundo real. 
                  O HubMail fornece uma caixa de entrada para ele trabalhar para você.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {codeSideHighlightCards.map(({ title, body }) => (
                    <div
                      key={title}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
                    >
                      <p className="text-base font-bold leading-snug text-white sm:text-lg">{title}</p>
                      <p className="mt-1.5 text-xs leading-snug text-neutral-500">{body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 sm:w-auto"
                  >
                    Abrir console
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <a
                    href="https://hubmail.to"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    Ver documentação
                  </a>
                </div>
              </div>

              {/* Code block: coluna direita em lg; cartão estica à altura da linha */}
              <div className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.08] bg-[#0d1117]">
                <div className="shrink-0 border-b border-white/[0.08] bg-[#0d1117] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-red-500/70" />
                    <div className="size-3 rounded-full bg-amber-500/70" />
                    <div className="size-3 rounded-full bg-emerald-500/70" />
                    <span className="ml-2 text-xs text-neutral-500">hubmail-agent.ts</span>
                  </div>
                </div>
                <div
                  className="home-code-shiki flex min-w-0 flex-1 flex-col rounded-b-xl px-3 py-3 text-[13px] [&_pre]:!m-0 [&_pre]:!max-h-none [&_pre]:!h-auto [&_pre]:!overflow-x-visible [&_pre]:!overflow-y-visible [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!font-mono [&_pre]:!text-[13px] [&_pre]:!leading-[0.76] [&_pre]:!tracking-tight [&_code]:!block [&_code]:!font-mono [&_code]:!text-[13px] [&_code]:!leading-[0.76] [&_code]:!tracking-tight [&_.line]:!block [&_.line]:!leading-[0.76] [&_.line]:!py-0 [&_.line]:!my-0 [&_.line_span]:!leading-[0.76]"
                  style={{ overflowX: "auto", overflowY: "visible" }}
                  dangerouslySetInnerHTML={{ __html: codeHtml }}
                />
              </div>
            </div>
          </div>
        </section>

        {blogPosts.length > 0 ? <BlogPreviewCarousel posts={blogPosts} /> : null}

        {/* Features */}
        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Funcionalidades
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo que você precisa para email programático
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-tcols-3 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/5">
                    <Icon className="size-5 text-white" aria-hidden />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Preços
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simples e transparente</h2>
              <p className="mt-3 text-neutral-400">Comece grátis. Escale conforme cresce.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "Free", price: "$0", features: ["3 inboxes", "3.000 emails/mês", "1 domínio", "3 GB"], highlight: false },
                { name: "Developer", price: "$20", features: ["10 inboxes", "10.000 emails/mês", "10 domínios", "10 GB"], highlight: false },
                { name: "Startup", price: "$200", features: ["150 inboxes", "150.000 emails/mês", "150 domínios", "150 GB"], highlight: true },
                { name: "Enterprise", price: "Custom", features: ["Ilimitado", "Preço por uso", "White-label", "SLA dedicado"], highlight: false },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border p-6 ${
                    plan.highlight
                      ? "border-white bg-white text-neutral-950"
                      : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Popular
                    </span>
                  )}
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${plan.highlight ? "text-neutral-500" : "text-neutral-500"}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-2 text-3xl font-bold ${plan.highlight ? "text-neutral-950" : "text-white"}`}>
                    {plan.price}
                    {plan.price !== "Custom" && (
                      <span className={`ml-1 text-sm font-normal ${plan.highlight ? "text-neutral-500" : "text-neutral-500"}`}>/mês</span>
                    )}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-neutral-700" : "text-neutral-400"}`}>
                        <Check className={`size-4 shrink-0 ${plan.highlight ? "text-neutral-950" : "text-emerald-400"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`mt-6 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? "bg-neutral-950 text-white hover:bg-neutral-800"
                        : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {plan.name === "Enterprise" ? "Falar com vendas" : "Começar"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pronto para começar?
            </h2>
            <p className="mt-4 text-neutral-400">
              Conecte seu servidor de correio em minutos. Sem cartão de crédito.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 sm:w-auto"
              >
                Abrir console
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-white text-neutral-950">
              <Inbox className="size-3.5" aria-hidden />
            </div>
            <span className="text-sm font-medium text-neutral-400">HubMail</span>
            <span className="text-sm text-neutral-600">· Construído sobre protocolos abertos</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-neutral-500">
            <Link href="/blog" className="hover:text-neutral-300 transition-colors">Blog</Link>
            <Link href="/terms" className="hover:text-neutral-300 transition-colors">Termos</Link>
            <Link href="/privacy" className="hover:text-neutral-300 transition-colors">Privacidade</Link>
            <a href="https://hubmail.to" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Docs</a>
            <a href="https://hubmail.to" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
