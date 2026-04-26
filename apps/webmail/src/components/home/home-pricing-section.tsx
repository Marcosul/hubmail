import Link from "next/link";
import { Check } from "lucide-react";
import { homePricingPlans } from "@/components/home/home-content";

export function HomePricingSection() {
  return (
    <section id="pricing" className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">Preços</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simples e transparente</h2>
          <p className="mt-3 text-neutral-400">Comece grátis. Escale conforme cresce.</p>
          <p className="mt-4">
            <Link
              href="/pricing"
              className="text-sm font-medium text-white underline-offset-4 transition-colors hover:text-neutral-200 hover:underline"
            >
              Ver página de preços e comparativo completo
            </Link>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {homePricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 ${
                plan.highlight
                  ? "border-white bg-white text-neutral-950"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Popular
                </span>
              ) : null}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{plan.name}</h3>
              <p className={`mt-2 text-3xl font-bold ${plan.highlight ? "text-neutral-950" : "text-white"}`}>
                {plan.price}
                {plan.price !== "Custom" ? (
                  <span className="ml-1 text-sm font-normal text-neutral-500">/mês</span>
                ) : null}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-neutral-700" : "text-neutral-400"}`}
                  >
                    <Check className={`size-4 shrink-0 ${plan.highlight ? "text-neutral-950" : "text-emerald-400"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "/enterprise" : "/login"}
                className={`mt-6 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-neutral-950 text-white hover:bg-neutral-800"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {plan.name === "Enterprise" ? "Agendar conversa" : "Começar"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
