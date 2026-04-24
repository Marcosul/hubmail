import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Termos de Uso | HubMail",
  description: "Termos de Uso da plataforma HubMail.",
};

const termsSections = [
  {
    title: "1. Aceitação dos termos",
    body: [
      "Ao acessar ou utilizar o HubMail, você declara que leu, compreendeu e concorda com estes Termos de Uso. Caso não concorde com qualquer condição, não utilize a plataforma.",
      "Estes termos se aplicam ao uso do painel, webmail, recursos administrativos, integrações e demais funcionalidades disponibilizadas pelo HubMail.",
    ],
  },
  {
    title: "2. Uso da plataforma",
    body: [
      "Você deve utilizar o HubMail apenas para fins lícitos, respeitando as leis aplicáveis, direitos de terceiros e políticas de provedores conectados à sua infraestrutura de e-mail.",
      "É proibido usar a plataforma para envio de spam, phishing, malware, conteúdo ilegal, tentativas de acesso não autorizado ou qualquer atividade que possa comprometer a segurança, reputação ou disponibilidade do serviço.",
    ],
  },
  {
    title: "3. Conta e credenciais",
    body: [
      "Você é responsável por manter a confidencialidade das suas credenciais, tokens, chaves de API e configurações administrativas associadas à sua conta.",
      "Qualquer atividade realizada com suas credenciais será considerada de sua responsabilidade, salvo quando houver falha comprovada de segurança causada exclusivamente pelo HubMail.",
    ],
  },
  {
    title: "4. Conteúdo e dados de e-mail",
    body: [
      "O conteúdo das mensagens, anexos, metadados e configurações gerenciadas pela plataforma pertence aos respectivos titulares ou administradores do ambiente conectado.",
      "Você declara possuir autorização para processar, armazenar, visualizar e administrar os dados de e-mail configurados no HubMail.",
    ],
  },
  {
    title: "5. Disponibilidade e alterações",
    body: [
      "Podemos atualizar, interromper ou modificar funcionalidades para manter a segurança, corrigir falhas, melhorar a experiência ou adequar a plataforma a requisitos técnicos e legais.",
      "Embora busquemos alta disponibilidade, o HubMail pode ficar temporariamente indisponível por manutenção, incidentes, limitações de infraestrutura ou dependências de terceiros.",
    ],
  },
  {
    title: "6. Limitação de responsabilidade",
    body: [
      "Na extensão permitida pela lei, o HubMail não será responsável por perdas indiretas, lucros cessantes, interrupções externas, falhas de provedores integrados ou danos decorrentes de uso indevido da plataforma.",
      "Você é responsável por manter backups, políticas de retenção, controles de acesso e configurações adequadas para o seu ambiente de e-mail.",
    ],
  },
  {
    title: "7. Atualizações destes termos",
    body: [
      "Estes Termos de Uso podem ser atualizados periodicamente. A versão vigente será sempre publicada nesta página, com indicação da data da última atualização.",
      "O uso contínuo da plataforma após alterações significa que você aceita os termos revisados.",
    ],
  },
  {
    title: "8. Contato",
    body: [
      "Para dúvidas sobre estes termos, entre em contato com a equipe responsável pela administração do seu ambiente HubMail.",
    ],
  },
];

const termsCopy = {
  "pt-BR": {
    title: "Termos de Uso",
    description:
      "Leia as regras e responsabilidades aplicáveis ao uso do HubMail, incluindo acesso ao webmail, painel administrativo, integrações e recursos de operação.",
    updatedAt: "24 de abril de 2026",
  },
  "en-US": {
    title: "Terms of Use",
    description:
      "Read the rules and responsibilities that apply to using HubMail, including webmail access, admin console, integrations, and operations features.",
    updatedAt: "April 24, 2026",
  },
  "es-ES": {
    title: "Términos de Uso",
    description:
      "Lee las reglas y responsabilidades aplicables al uso de HubMail, incluyendo acceso al webmail, panel administrativo, integraciones y funciones de operación.",
    updatedAt: "24 de abril de 2026",
  },
};

export default async function TermsPage() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  const copy = termsCopy[locale];

  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      updatedAt={copy.updatedAt}
      sections={termsSections}
      backHomeLabel={messages.legal.backHome}
      eyebrowLabel={messages.legal.eyebrow}
      updatedAtLabel={messages.legal.updatedAt}
    />
  );
}
