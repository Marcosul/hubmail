import {
  Bot,
  CalendarClock,
  FileStack,
  MessagesSquare,
} from "lucide-react";

const useCases = [
  {
    icon: Bot,
    label: "Agentes em navegador",
    title: "Extrair códigos 2FA",
    description:
      "Inbox dedicada para OTPs e confirmações. Seu agente lê o email e segue o fluxo de cadastro ou login sem intervenção manual.",
  },
  {
    icon: CalendarClock,
    label: "Agendamento",
    title: "Assistente executivo",
    description:
      "Receba convites, proponha horários e envie confirmações respondendo na mesma thread, com identidade de email consistente.",
  },
  {
    icon: FileStack,
    label: "Documentos",
    title: "Processar anexos",
    description:
      "Faturas, comprovantes e PDFs chegam na inbox; webhooks disparam parse, classificação e armazenamento no seu backend.",
  },
  {
    icon: MessagesSquare,
    label: "Atendimento",
    title: "Roteamento inteligente",
    description:
      "Ingerir tickets por email, classificar com IA e encaminhar para o time certo, com histórico completo na thread.",
  },
] as const;

export function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="border-t border-white/[0.06] bg-white/[0.015] px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Casos de uso
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Email programático para cada tipo de fluxo
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-400 sm:text-lg">
            Do checkout automatizado ao suporte: o HubMail permite que agentes e aplicações conversem por email como
            pessoas reais — com threads, anexos e eventos em tempo real.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {useCases.map(({ icon: Icon, label, title, description }) => (
            <article
              key={title}
              className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[#080808] p-6 transition-colors hover:border-white/[0.14] hover:bg-white/[0.03] sm:p-7 lg:min-h-[220px]"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">{label}</p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h3>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors group-hover:border-white/[0.12] group-hover:bg-white/[0.06]">
                  <Icon className="size-5 text-white" aria-hidden />
                </div>
              </div>
              <p className="text-sm leading-relaxed text-neutral-500 sm:text-[15px]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
