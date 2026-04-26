import Link from "next/link";
import { Check } from "lucide-react";
import { pricingPlansDetail } from "@/lib/pricing-plans";

export function PricingPlanCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pricingPlansDetail.map((plan) => (
        <div
          key={plan.name}
          className={`relative flex flex-col rounded-xl border p-6 ${
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
          <p className={`mt-2 flex flex-wrap items-baseline gap-1 text-3xl font-bold ${plan.highlight ? "text-neutral-950" : "text-white"}`}>
            {plan.price}
            {plan.periodLabel ? (
              <span className={`text-sm font-normal ${plan.highlight ? "text-neutral-500" : "text-neutral-500"}`}>
                {plan.periodLabel}
              </span>
            ) : null}
          </p>
          <p className={`mt-2 text-sm ${plan.highlight ? "text-neutral-600" : "text-neutral-500"}`}>{plan.tagline}</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {plan.bullets.map((line) => (
              <li
                key={line}
                className={`flex gap-2 text-sm leading-snug ${plan.highlight ? "text-neutral-800" : "text-neutral-400"}`}
              >
                <Check className={`mt-0.5 size-4 shrink-0 ${plan.highlight ? "text-neutral-950" : "text-emerald-400"}`} />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href={plan.ctaHref}
            className={`mt-8 flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              plan.highlight
                ? "bg-neutral-950 text-white hover:bg-neutral-800"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {plan.ctaLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
