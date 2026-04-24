import Link from "next/link";
import { ArrowRight, Mail, Shield, Zap } from "lucide-react";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

const featureIcons = [Zap, Shield, Mail] as const;

export default async function HomePage() {
  const messages = getMessages(await getServerLocale());
  const copy = messages.home;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white text-neutral-950">
              <Mail className="size-4" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight">HubMail</span>
          </div>
          <nav className="flex flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 hover:text-white sm:px-4"
            >
              {copy.signIn}
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 sm:px-4"
            >
              {copy.openConsole}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">
            {copy.description}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
            >
              {copy.getStarted}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href="https://stalw.art/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              {copy.docs}
            </a>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {copy.features.map(({ title, body }, index) => {
              const Icon = featureIcons[index] ?? Mail;
              return (
                <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <Icon className="size-8 text-emerald-400" aria-hidden />
                  <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>{copy.footer}</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Links legais">
            <Link href="/terms" className="hover:text-neutral-300">
              {copy.terms}
            </Link>
            <Link href="/privacy" className="hover:text-neutral-300">
              {copy.privacy}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
