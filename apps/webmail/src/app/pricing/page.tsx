import type { Metadata } from "next";
import Link from "next/link";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { PricingComparisonTables } from "@/components/pricing/pricing-comparison-tables";
import { PricingLaunchOffer } from "@/components/pricing/pricing-launch-offer";
import { PricingPlanCards } from "@/components/pricing/pricing-plan-cards";

export const metadata: Metadata = {
  title: "Preços — HubMail",
  description:
    "Preços transparentes que escalam consigo. Sem taxas escondidas, sem cobrança por lugar na API do HubMail.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <HomeHeader />

      <main className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Preços do HubMail</h1>
            <blockquote className="mt-6 border-l-2 border-white/20 pl-5 text-left text-base leading-relaxed text-neutral-400 sm:text-lg sm:pl-6">
              Preços transparentes que escalam consigo. Sem taxas escondidas, sem cobrança por lugar no acesso à API.
            </blockquote>
          </header>

          <section className="mt-14" aria-labelledby="plans-heading">
            <h2 id="plans-heading" className="sr-only">
              Planos
            </h2>
            <PricingPlanCards />
          </section>

          <div className="mt-14">
            <PricingLaunchOffer />
          </div>

          <section className="mt-20" aria-labelledby="compare-heading">
            <h2 id="compare-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Comparativo de funcionalidades
            </h2>
            <p className="mt-2 text-sm text-neutral-500 sm:text-base">
              Visão detalhada por plano — alinhada ao que espera de uma plataforma de email para agentes e integrações.
            </p>
            <div className="mt-10">
              <PricingComparisonTables />
            </div>
          </section>

          <section className="mt-16 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 sm:px-8">
            <h2 className="text-lg font-semibold text-white">Ligações úteis</h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              <li>
                <Link href="/login" className="text-white underline-offset-4 hover:underline">
                  Abrir consola
                </Link>
              </li>
              <li>
                <Link href="/enterprise" className="text-white underline-offset-4 hover:underline">
                  Enterprise — agendar chamada
                </Link>
              </li>
              <li>
                <a href="https://hubmail.to" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  Documentação
                </a>
              </li>
              <li>
                <Link href="/" className="underline-offset-4 hover:underline">
                  Página inicial
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
