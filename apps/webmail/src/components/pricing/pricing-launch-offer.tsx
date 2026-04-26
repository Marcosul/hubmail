import Link from "next/link";

export function PricingLaunchOffer() {
  return (
    <section
      className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-5 py-6 sm:px-8 sm:py-8"
      aria-labelledby="pricing-launch-heading"
    >
      <h2 id="pricing-launch-heading" className="text-lg font-semibold text-white sm:text-xl">
        Oferta de lançamento
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base">
        Startups em fase inicial podem candidatar-se a um mês gratuito no plano Startup. Sem compromisso — analisamos
        cada pedido manualmente.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        Candidatar agora
      </Link>
    </section>
  );
}
