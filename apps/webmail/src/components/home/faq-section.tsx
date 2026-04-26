"use client";

import { useCallback, useId, useState } from "react";

const faqItems = [
  {
    question: "O que é o HubMail?",
    answer:
      "O HubMail é uma plataforma de email orientada a API para construir agentes e automações que enviam e recebem correio. Diferente de APIs só de envio, ele suporta conversas bidirecionais: ler threads, responder e receber eventos em tempo real via webhooks.",
  },
  {
    question: "Integra com Gmail?",
    answer:
      "O HubMail é um serviço de inboxes e domínios próprios — não é uma extensão do Gmail. Você usa endereços no seu domínio ou no HubMail e integra via API, SMTP/IMAP e webhooks. Para fluxos híbridos, é possível encaminhar ou conectar pipelines no seu backend.",
  },
  {
    question: "Como é diferente de SendGrid ou Mailgun?",
    answer:
      "Ferramentas clássicas de transacional focam em disparo em massa e métricas de entrega. O HubMail enfatiza inboxes programáticas, threads, recepção e automação (incluindo agentes), com o mesmo rigor de autenticação DNS e entregabilidade.",
  },
  {
    question: "Posso usar meu próprio domínio?",
    answer:
      "Sim. Você adiciona o domínio, configura os registros DNS indicados (SPF, DKIM, DMARC) e envia a partir dos seus endereços. A verificação guia o processo até o domínio ficar pronto para produção.",
  },
  {
    question: "Como evitar cair no spam?",
    answer:
      "Use domínio autenticado, conteúdo relevante, listas com opt-in e aquecimento de reputação ao escalar. O HubMail ajuda com SPF/DKIM/DMARC e boas práticas de cabeçalhos; reputação de IP/domínio continua sendo um esforço conjunto com o seu uso.",
  },
  {
    question: "Há suporte a anexos?",
    answer:
      "Sim. Envio e receção podem incluir anexos; webhooks e a API permitem que seu sistema processe ficheiros (por exemplo, faturas ou PDFs) de forma automatizada.",
  },
  {
    question: "Oferecem planos enterprise?",
    answer:
      "Sim. Para volumes elevados, requisitos de compliance, SLA ou white-label, contacte a equipa comercial. O plano Enterprise é ajustado ao seu caso.",
  },
] as const;

export function FaqSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = useCallback((index: number) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  }, []);

  return (
    <section
      id="faq"
      className="border-t border-dotted border-white/[0.12] bg-[#050505] px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl border border-dotted border-white/[0.14]">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <header className="border-b border-dotted border-white/[0.12] px-6 py-10 sm:px-8 sm:py-12 lg:border-b-0 lg:border-r lg:border-white/[0.12] lg:px-10 lg:py-14">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              [ FAQ ]
            </p>
            <h2 className="mt-5 max-w-md text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
              Perguntas frequentes.
            </h2>
          </header>

          <div className="min-w-0">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `${baseId}-panel-${index}`;
              const triggerId = `${baseId}-trigger-${index}`;
              const isLast = index === faqItems.length - 1;

              return (
                <div
                  key={item.question}
                  className={`px-6 py-5 sm:px-8 sm:py-6 ${!isLast ? "border-b border-dotted border-white/[0.12]" : ""}`}
                >
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                  >
                    <span className="block text-base font-semibold text-white sm:text-[17px]">
                      {item.question}
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    hidden={!isOpen}
                    className="mt-3"
                  >
                    <p className="text-sm leading-relaxed text-neutral-400 sm:text-[15px]">{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
