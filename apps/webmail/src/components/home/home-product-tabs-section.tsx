"use client";

import { useId, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Globe,
  Inbox,
  KeyRound,
  MessagesSquare,
  Paperclip,
  Plug2,
  Webhook,
} from "lucide-react";

type Capability = {
  id: string;
  tabLabel: string;
  description: string;
  icon: LucideIcon;
  /** Índices 0–15 da grelha 4×4 onde o ícone aparece (padrão fixo). */
  gridSlots: readonly number[];
};

const CAPABILITIES: readonly Capability[] = [
  {
    id: "inboxes",
    tabLabel: "API de inboxes",
    description: "Crie, configure e opere inboxes de email inteiramente via API, com credenciais SMTP/IMAP.",
    icon: Inbox,
    gridSlots: [0, 3, 5, 6, 9, 10, 12, 15],
  },
  {
    id: "threads",
    tabLabel: "Threads e respostas",
    description: "Conversas bidirecionais: leia a thread, gere respostas e mantenha o contexto como num cliente de email.",
    icon: MessagesSquare,
    gridSlots: [1, 4, 7, 8, 11, 13, 14],
  },
  {
    id: "attachments",
    tabLabel: "Anexos",
    description: "Envie e receba anexos; o seu backend processa faturas, PDFs e outros ficheiros a partir de webhooks.",
    icon: Paperclip,
    gridSlots: [2, 5, 6, 9, 10, 12],
  },
  {
    id: "realtime",
    tabLabel: "Eventos em tempo real",
    description: "Webhooks assinados para MAIL_RECEIVED, MAIL_SENT e MAIL_BOUNCED — integração imediata com o seu stack.",
    icon: Webhook,
    gridSlots: [0, 2, 4, 7, 11, 14, 15],
  },
  {
    id: "domains",
    tabLabel: "Domínios personalizados",
    description: "Envie a partir do seu domínio com verificação DNS e boas práticas SPF, DKIM e DMARC.",
    icon: Globe,
    gridSlots: [1, 3, 6, 8, 10, 13],
  },
  {
    id: "agents",
    tabLabel: "Agentes de IA",
    description: "Ligue modelos de linguagem para classificar, resumir e responder email automaticamente.",
    icon: Bot,
    gridSlots: [0, 4, 5, 9, 12, 13, 14, 15],
  },
  {
    id: "keys",
    tabLabel: "API Keys e escopos",
    description: "Chaves com permissões granulares, rotação e revogação sem derrubar o resto da integração.",
    icon: KeyRound,
    gridSlots: [2, 3, 7, 8, 11, 12],
  },
  {
    id: "mcp",
    tabLabel: "SDKs + MCP",
    description: "SDK tipado e servidor MCP para assistentes descobrirem inboxes, domínios e webhooks de forma padronizada.",
    icon: Plug2,
    gridSlots: [1, 5, 6, 10, 11, 14],
  },
] as const;

const GRID_SIZE = 16;

function CornerFrame({ className }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 rounded-xl border border-white/[0.08] ${className ?? ""}`}
      aria-hidden
    >
      <span className="absolute left-3 top-3 h-4 w-4 border-l border-t border-white/25" />
      <span className="absolute right-3 top-3 h-4 w-4 border-r border-t border-white/25" />
      <span className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-white/25" />
      <span className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-white/25" />
    </span>
  );
}

function GridCell({
  showIcon,
  Icon,
}: {
  showIcon: boolean;
  Icon: LucideIcon;
}) {
  return (
    <div className="relative aspect-square min-h-0 rounded-md bg-[#121212]">
      <span className="absolute left-1 top-1 h-2 w-2 border-l border-t border-white/20" aria-hidden />
      <span className="absolute right-1 top-1 h-2 w-2 border-r border-t border-white/20" aria-hidden />
      <span className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-white/20" aria-hidden />
      <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-white/20" aria-hidden />
      <div className="flex h-full w-full items-center justify-center p-2">
        {showIcon ? <Icon className="size-[42%] min-h-[1.25rem] min-w-[1.25rem] text-white/90" strokeWidth={1.25} aria-hidden /> : null}
      </div>
    </div>
  );
}

export function HomeProductTabsSection() {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const activeItem = CAPABILITIES[active]!;
  const ActiveIcon = activeItem.icon;

  const slotSet = new Set(activeItem.gridSlots);

  return (
    <section
      id="features"
      className="border-b border-white/[0.06] bg-black px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-center font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          [ Plataforma ]
        </p>
        <h2 className="mx-auto max-w-4xl text-center text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
          <span className="text-neutral-500">Não é IA no seu email.</span>{" "}
          <span className="text-white">É email para sua IA.</span>
        </h2>

        <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-start lg:gap-12">
          <div
            role="tablist"
            aria-label="Capacidades do HubMail"
            className="flex min-w-0 flex-col gap-1"
          >
            {CAPABILITIES.map((item, index) => {
              const isActive = index === active;
              const Icon = item.icon;
              const tabId = `${baseId}-tab-${index}`;
              const panelId = `${baseId}-panel`;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={tabId}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  onClick={() => setActive(index)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:gap-4 sm:px-4 sm:py-3.5 ${
                    isActive ? "bg-[#141414]" : "bg-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10 ${
                      isActive ? "border-white/15 bg-white/[0.06]" : "border-white/[0.08] bg-white/[0.03]"
                    }`}
                  >
                    <Icon className="size-[18px] text-white sm:size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold sm:text-base ${isActive ? "text-white" : "text-neutral-200"}`}>
                      {item.tabLabel}
                    </span>
                    {isActive ? (
                      <span className="mt-1 block text-sm leading-relaxed text-neutral-500">{item.description}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            className="relative min-h-[280px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#070707] p-4 sm:min-h-[320px] sm:p-5 lg:min-h-[380px] lg:p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          >
            <CornerFrame />
            <div className="relative grid h-full min-h-[240px] grid-cols-4 grid-rows-4 gap-2 sm:min-h-[280px] sm:gap-2.5 lg:min-h-[320px]">
              {Array.from({ length: GRID_SIZE }, (_, i) => (
                <GridCell key={i} showIcon={slotSet.has(i)} Icon={ActiveIcon} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
