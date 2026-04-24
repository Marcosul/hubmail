import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Política de Privacidade | HubMail",
  description: "Política de Privacidade da plataforma HubMail.",
};

const privacySections = [
  {
    title: "1. Informações que coletamos",
    body: [
      "Podemos tratar informações de conta, como nome, e-mail, permissões, identificadores técnicos e preferências necessárias para autenticação, segurança e operação do HubMail.",
      "Quando a plataforma é conectada ao seu ambiente de e-mail, também podem ser processados dados de mensagens, remetentes, destinatários, assuntos, anexos, pastas, logs e metadados técnicos.",
    ],
  },
  {
    title: "2. Como usamos os dados",
    body: [
      "Usamos os dados para fornecer acesso ao webmail, painel administrativo, métricas, regras de domínio, chaves de API, integrações e demais funcionalidades da plataforma.",
      "Também utilizamos informações técnicas para proteger contas, investigar incidentes, prevenir abuso, melhorar a estabilidade e cumprir obrigações legais ou regulatórias aplicáveis.",
    ],
  },
  {
    title: "3. Bases legais",
    body: [
      "O tratamento pode ocorrer para execução de contrato, cumprimento de obrigação legal, exercício regular de direitos, legítimo interesse na segurança e operação da plataforma ou mediante consentimento quando necessário.",
      "Quando você administra contas de terceiros, deve garantir que possui base legal e autorização adequada para tratar esses dados no HubMail.",
    ],
  },
  {
    title: "4. Compartilhamento",
    body: [
      "Podemos compartilhar dados com provedores de infraestrutura, autenticação, banco de dados, observabilidade e serviços técnicos necessários para operar o HubMail.",
      "Não vendemos dados pessoais. Compartilhamentos adicionais podem ocorrer por exigência legal, ordem de autoridade competente ou para proteger direitos, segurança e integridade da plataforma.",
    ],
  },
  {
    title: "5. Segurança",
    body: [
      "Adotamos medidas técnicas e organizacionais para reduzir riscos de acesso indevido, perda, alteração, divulgação não autorizada e indisponibilidade dos dados.",
      "Nenhum sistema é completamente imune a incidentes. Por isso, recomendamos o uso de senhas fortes, autenticação segura, revisão de permissões e boas práticas de administração do ambiente.",
    ],
  },
  {
    title: "6. Retenção",
    body: [
      "Mantemos dados pelo tempo necessário para fornecer a plataforma, cumprir obrigações legais, resolver disputas, auditar segurança e atender às finalidades descritas nesta política.",
      "Dados de e-mail, logs e configurações podem seguir políticas de retenção definidas pelo administrador do ambiente conectado.",
    ],
  },
  {
    title: "7. Direitos dos titulares",
    body: [
      "Conforme a legislação aplicável, titulares podem solicitar acesso, correção, exclusão, portabilidade, limitação, oposição ao tratamento ou informações sobre o uso de seus dados.",
      "Algumas solicitações podem depender da validação de identidade, da atuação do administrador do ambiente ou de retenções necessárias por motivos legais e de segurança.",
    ],
  },
  {
    title: "8. Alterações desta política",
    body: [
      "Esta Política de Privacidade pode ser atualizada para refletir mudanças legais, técnicas ou operacionais. A versão vigente ficará disponível nesta página.",
      "Recomendamos revisar esta política periodicamente para acompanhar como os dados são tratados no HubMail.",
    ],
  },
  {
    title: "9. Contato",
    body: [
      "Para exercer direitos ou tirar dúvidas sobre privacidade, entre em contato com a equipe responsável pela administração do seu ambiente HubMail.",
    ],
  },
];

const privacyCopy = {
  "pt-BR": {
    title: "Política de Privacidade",
    description:
      "Entenda quais dados podem ser tratados pelo HubMail, para quais finalidades eles são utilizados e quais controles ajudam a proteger sua operação.",
    updatedAt: "24 de abril de 2026",
  },
  "en-US": {
    title: "Privacy Policy",
    description:
      "Understand which data HubMail may process, why it is used, and which controls help protect your operation.",
    updatedAt: "April 24, 2026",
  },
  "es-ES": {
    title: "Política de Privacidad",
    description:
      "Entiende qué datos puede tratar HubMail, para qué finalidades se usan y qué controles ayudan a proteger tu operación.",
    updatedAt: "24 de abril de 2026",
  },
};

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  const copy = privacyCopy[locale];

  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      updatedAt={copy.updatedAt}
      sections={privacySections}
      backHomeLabel={messages.legal.backHome}
      eyebrowLabel={messages.legal.eyebrow}
      updatedAtLabel={messages.legal.updatedAt}
    />
  );
}
