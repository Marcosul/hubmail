import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HomeCtaSection() {
  return (
    <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pronto para começar?</h2>
        <p className="mt-4 text-neutral-400">Conecte seu servidor de correio em minutos. Sem cartão de crédito.</p>
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
  );
}
