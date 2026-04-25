import Link from "next/link";
import { ArrowRight, Check, Terminal, Inbox, Globe, Webhook, KeyRound, Bot } from "lucide-react";

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
    icon: Terminal,
    title: "Self-hosted com Stalwart",
    body: "Roda sobre Stalwart Mail Server. Você controla seus dados, sua infraestrutura, suas políticas.",
  },
] as const;

const stats = [
  { label: "Latência de entrega", value: "< 500ms" },
  { label: "Uptime garantido", value: "99.9%" },
  { label: "Protocolos suportados", value: "JMAP · SMTP · IMAP" },
  { label: "Open source", value: "MIT" },
] as const;

export default function HomePage() {
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
            <a href="https://stalw.art/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
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
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
            <div className="mt-16 h-[500px] w-[900px] rounded-full bg-white/[0.03] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Self-hosted · Open source · Stalwart-powered
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Email infraestrutura{" "}
              <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                para agentes de IA
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">
              Inboxes programáticas, webhooks em tempo real e domínios personalizados — tudo conectado ao seu servidor Stalwart, com API REST completa e suporte a AI SDK.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 sm:w-auto"
              >
                Abrir console
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="https://stalw.art/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Ver documentação
              </a>
            </div>
          </div>
        </section>

        {/* Code + stats */}
        <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              {/* Code block */}
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0d]">
                <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
                  <div className="size-3 rounded-full bg-red-500/70" />
                  <div className="size-3 rounded-full bg-amber-500/70" />
                  <div className="size-3 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-xs text-neutral-500">hubmail-agent.ts</span>
                </div>
                <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed">
                  <code className="text-neutral-300">
                    {CODE_SNIPPET.split("\n").map((line, i) => (
                      <span key={i} className="block">
                        {line
                          .replace(/\/\/.*/g, (m) => `<comment>${m}</comment>`)
                          .split(/(<comment>.*?<\/comment>)/g)
                          .map((part, j) =>
                            part.startsWith("<comment>") ? (
                              <span key={j} className="text-neutral-600">
                                {part.replace(/<\/?comment>/g, "")}
                              </span>
                            ) : (
                              <span key={j}>{part}</span>
                            ),
                          )}
                      </span>
                    ))}
                  </code>
                </pre>
              </div>

              {/* Stats */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Infraestrutura de email pronta para produção
                </h2>
                <p className="text-neutral-400">
                  Construído sobre protocolos abertos (JMAP, SMTP, IMAP) com Stalwart Mail Server. Você tem controle total dos dados e da infraestrutura.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
                    >
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="mt-1 text-xs text-neutral-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Integração JMAP nativa com Stalwart",
                    "Assinatura HMAC em todos os webhooks",
                    "Credenciais criptografadas AES-256-GCM",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-neutral-400">
                      <Check className="size-4 shrink-0 text-emerald-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

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
              Conecte seu servidor Stalwart em minutos. Sem cartão de crédito.
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
            <Link href="/terms" className="hover:text-neutral-300 transition-colors">Termos</Link>
            <Link href="/privacy" className="hover:text-neutral-300 transition-colors">Privacidade</Link>
            <a href="https://stalw.art/docs" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Docs</a>
            <a href="https://github.com/stalwartlabs" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
