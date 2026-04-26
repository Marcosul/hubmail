import Link from "next/link";
import { Mail } from "lucide-react";

type BlogChromeProps = {
  backLabel: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function BlogChrome({ backLabel, eyebrow, children }: BlogChromeProps) {
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/blog"
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 hover:text-white sm:px-4"
            >
              Blog
            </Link>
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 hover:text-white sm:px-4"
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">{eyebrow}</p>
        {children}
      </main>
    </div>
  );
}
