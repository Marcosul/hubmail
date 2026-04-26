import Link from "next/link";
import { codeToHtml } from "shiki";
import { ArrowRight } from "lucide-react";
import { homeHeroCodeSnippet, homeHeroHighlightCards } from "@/components/home/home-content";

export async function HomeHero() {
  const codeHtml = await codeToHtml(homeHeroCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
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
              Seu agente de IA precisa de uma caixa de entrada para se comunicar com o mundo real. O HubMail fornece
              uma caixa de entrada para ele trabalhar para você.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {homeHeroHighlightCards.map(({ title, body }) => (
                <div key={title} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
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
  );
}
