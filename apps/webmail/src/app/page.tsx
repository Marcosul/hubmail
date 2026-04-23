import Link from "next/link";
import { ArrowRight, Mail, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white text-neutral-950">
              <Mail className="size-4" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight">HubMail</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
            >
              Open console
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">Self-hosted mail</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Control plane and webmail for your Stalwart deployment.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-neutral-400">
            Dashboard inspired by modern mail platforms: inboxes, domains, webhooks, metrics — with a clean path to
            connect your Nest API and Supabase-backed accounts.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
            >
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href="https://stalw.art/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Stalwart docs
            </a>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              {
                icon: Zap,
                title: "Fast stack",
                body: "Next.js App Router, Nest-ready API boundary, and Supabase-friendly data layer.",
              },
              {
                icon: Shield,
                title: "Operator-first",
                body: "Dark and light themes, responsive layout from mobile to 1360px desktop.",
              },
              {
                icon: Mail,
                title: "Mail aware",
                body: "Screens for SMTP/IMAP export, unified inbox, and domain posture — wired to your server next.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <Icon className="size-8 text-emerald-400" aria-hidden />
                <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-neutral-500">
        HubMail · Built on open protocols
      </footer>
    </div>
  );
}
