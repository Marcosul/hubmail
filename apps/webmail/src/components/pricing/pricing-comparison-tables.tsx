import { Check, Minus } from "lucide-react";
import type { ComparisonCell } from "@/lib/pricing-plans";
import { pricingComparisonSections } from "@/lib/pricing-plans";

function ComparisonCellView({ value }: { value: ComparisonCell }) {
  if (typeof value === "boolean") {
    if (value) {
      return <Check className="mx-auto size-4 text-emerald-400" aria-label="Incluído" />;
    }
    return <Minus className="mx-auto size-4 text-neutral-600" aria-label="Não incluído" />;
  }
  return <span className="text-neutral-300">{value}</span>;
}

export function PricingComparisonTables() {
  return (
    <div className="space-y-14">
      {pricingComparisonSections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-4 text-lg font-semibold text-white">{section.title}</h3>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="px-4 py-3 text-left font-medium text-neutral-400">Funcionalidade</th>
                  <th className="px-3 py-3 text-center font-semibold text-white">Free</th>
                  <th className="px-3 py-3 text-center font-semibold text-white">Developer</th>
                  <th className="px-3 py-3 text-center font-semibold text-white">Startup</th>
                  <th className="px-3 py-3 text-center font-semibold text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.feature} className="border-b border-white/[0.06] last:border-b-0">
                    <td className="px-4 py-3 font-medium text-neutral-200">{row.feature}</td>
                    <td className="px-3 py-3 text-center text-neutral-400">
                      <ComparisonCellView value={row.free} />
                    </td>
                    <td className="px-3 py-3 text-center text-neutral-400">
                      <ComparisonCellView value={row.developer} />
                    </td>
                    <td className="px-3 py-3 text-center text-neutral-400">
                      <ComparisonCellView value={row.startup} />
                    </td>
                    <td className="px-3 py-3 text-center text-neutral-400">
                      <ComparisonCellView value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
