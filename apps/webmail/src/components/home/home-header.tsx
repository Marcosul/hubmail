import Link from "next/link";
import { HubMailMarkOnDarkSurface } from "@/components/brand/hubmail-mark";

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center">
            <HubMailMarkOnDarkSurface className="size-7" />
          </span>
          <span className="text-base font-semibold tracking-tight">HubMail</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-neutral-400 sm:flex">
          <Link href="/#features" className="transition-colors hover:text-white">
            Funcionalidades
          </Link>
          <Link href="/#use-cases" className="transition-colors hover:text-white">
            Casos de uso
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-white">
            Preços
          </Link>
          <Link href="/enterprise" className="transition-colors hover:text-white">
            Enterprise
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-white">
            FAQ
          </Link>
          <Link href="/blog" className="transition-colors hover:text-white">
            Blog
          </Link>
          <a
            href="https://hubmail.to"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
