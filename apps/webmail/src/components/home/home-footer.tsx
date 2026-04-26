import type { ReactNode } from "react";
import Link from "next/link";
import { Github, Linkedin, MessageCircle } from "lucide-react";
import { HubMailMarkOnDarkSurface } from "@/components/brand/hubmail-mark";

const SOCIAL = {
  github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB_URL,
  discord: process.env.NEXT_PUBLIC_SOCIAL_DISCORD_URL,
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL,
  x: process.env.NEXT_PUBLIC_SOCIAL_X_URL,
} as const;

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string | undefined;
  label: string;
  children: ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-500 transition-colors hover:border-white/15 hover:text-white"
    >
      {children}
    </a>
  );
}

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-black text-white">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.15) 7px, rgba(255,255,255,0.15) 8px)",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.45fr)_minmax(0,0.4fr)] lg:gap-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-neutral-300">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              Todos os sistemas operacionais
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center">
                <HubMailMarkOnDarkSurface className="size-9" />
              </span>
              <span className="text-xl font-semibold tracking-tight">HubMail</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
              Email programático para agentes de IA — inboxes, webhooks e domínios com API de primeira classe.
            </p>
            <p>
              <a
                href="mailto:support@hubmail.to"
                className="text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-300 hover:underline"
              >
                support@hubmail.to
              </a>
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Navegação</p>
            <nav className="flex flex-col gap-2.5 text-sm text-neutral-500">
              <Link href="/" className="w-fit transition-colors hover:text-white">
                Início
              </Link>
              <Link href="/enterprise" className="w-fit transition-colors hover:text-white">
                Enterprise
              </Link>
              <Link href="/pricing" className="w-fit transition-colors hover:text-white">
                Preços
              </Link>
              <Link href="/blog" className="w-fit transition-colors hover:text-white">
                Blog
              </Link>
              <a
                href="https://hubmail.to"
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit transition-colors hover:text-white"
              >
                Docs
              </a>
              <Link href="/login" className="w-fit transition-colors hover:text-white">
                Consola
              </Link>
            </nav>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Social</p>
            {[SOCIAL.github, SOCIAL.discord, SOCIAL.linkedin, SOCIAL.x].some(Boolean) ? (
              <div className="flex flex-wrap gap-2">
                <SocialIconLink href={SOCIAL.github} label="GitHub">
                  <Github className="size-[18px]" strokeWidth={1.75} />
                </SocialIconLink>
                <SocialIconLink href={SOCIAL.discord} label="Discord">
                  <MessageCircle className="size-[18px]" strokeWidth={1.75} />
                </SocialIconLink>
                <SocialIconLink href={SOCIAL.linkedin} label="LinkedIn">
                  <Linkedin className="size-[18px]" strokeWidth={1.75} />
                </SocialIconLink>
                <SocialIconLink href={SOCIAL.x} label="X">
                  <span className="text-xs font-bold" aria-hidden>
                    X
                  </span>
                </SocialIconLink>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Links sociais em breve.</p>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-8 border-t border-white/[0.06] pt-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Segurança e privacidade</span>
              <span className="text-neutral-600">·</span>
              <Link href="/privacy" className="transition-colors hover:text-white">
                Centro de confiança
              </Link>
            </div>
            <p className="text-sm text-neutral-600">© {year} HubMail. Todos os direitos reservados.</p>
          </div>
          <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-500">
            <Link href="/privacy" className="transition-colors hover:text-neutral-300">
              Política de privacidade
            </Link>
            <span className="text-neutral-700" aria-hidden>
              ·
            </span>
            <Link href="/terms" className="transition-colors hover:text-neutral-300">
              Termos de serviço
            </Link>
            <span className="text-neutral-700" aria-hidden>
              ·
            </span>
            <Link href="/privacy" className="transition-colors hover:text-neutral-300">
              Subprocessadores
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
