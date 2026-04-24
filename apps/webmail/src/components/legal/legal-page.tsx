import Link from "next/link";
import { Mail } from "lucide-react";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  backHomeLabel: string;
  eyebrowLabel: string;
  updatedAtLabel: string;
};

export function LegalPage({
  title,
  description,
  updatedAt,
  sections,
  backHomeLabel,
  eyebrowLabel,
  updatedAtLabel,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white text-neutral-950">
              <Mail className="size-4" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight">HubMail</span>
          </Link>
          <Link
            href="/"
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 hover:text-white"
          >
            {backHomeLabel}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">{eyebrowLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-400 sm:text-lg">{description}</p>
        <p className="mt-4 text-sm text-neutral-500">
          {updatedAtLabel}: {updatedAt}
        </p>

        <div className="mt-12 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-white">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-400 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
