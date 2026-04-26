import type { Metadata } from "next";
import { EnterpriseCalEmbed } from "@/components/enterprise/enterprise-cal-embed";
import { EnterprisePageBackdrop } from "@/components/enterprise/enterprise-page-backdrop";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";

export const metadata: Metadata = {
  title: "Enterprise — HubMail",
  description:
    "Fale com a equipa HubMail para soluções enterprise, volume e requisitos de segurança. Agende uma chamada.",
};

export default function EnterprisePage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <EnterprisePageBackdrop />
      <div className="relative z-10">
        <HomeHeader />

        <main className="px-4 pb-24 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-6xl border border-dotted border-white/[0.12] px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
              <header className="max-w-lg">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                  [ Enterprise ]
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Enterprise</h1>
                <p className="mt-4 text-base leading-relaxed text-neutral-400 sm:text-lg">
                  Entre em contacto para soluções à medida das suas necessidades — volume, compliance, SSO e
                  implementação dedicada.
                </p>
              </header>

              <div className="min-w-0">
                <EnterpriseCalEmbed />
              </div>
            </div>
          </div>
        </main>

        <HomeFooter />
      </div>
    </div>
  );
}
