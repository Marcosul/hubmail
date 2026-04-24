import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

const termsCopy = {
  "pt-BR": {
    title: "Termos de Uso",
    description:
      "Leia as regras e responsabilidades aplicáveis ao uso do HubMail, incluindo acesso ao webmail, painel administrativo, integrações e recursos de operação.",
    updatedAt: "24 de abril de 2026",
    metadataDescription: "Termos de Uso da plataforma HubMail.",
    sections: [
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
        body: ["Para dúvidas sobre estes termos, entre em contato com a equipe responsável pela administração do seu ambiente HubMail."],
      },
    ],
  },
  "en-US": {
    title: "Terms of Use",
    description:
      "Read the rules and responsibilities that apply to using HubMail, including webmail access, admin console, integrations, and operations features.",
    updatedAt: "April 24, 2026",
    metadataDescription: "Terms of Use for the HubMail platform.",
    sections: [
      {
        title: "1. Acceptance of terms",
        body: [
          "By accessing or using HubMail, you confirm that you have read, understood, and agree to these Terms of Use. If you do not agree with any condition, do not use the platform.",
          "These terms apply to the console, webmail, administrative features, integrations, and other functionality provided by HubMail.",
        ],
      },
      {
        title: "2. Platform use",
        body: [
          "You must use HubMail only for lawful purposes, respecting applicable laws, third-party rights, and policies from providers connected to your email infrastructure.",
          "You may not use the platform for spam, phishing, malware, illegal content, unauthorized access attempts, or any activity that may compromise service security, reputation, or availability.",
        ],
      },
      {
        title: "3. Account and credentials",
        body: [
          "You are responsible for keeping credentials, tokens, API keys, and administrative settings associated with your account confidential.",
          "Any activity performed with your credentials is considered your responsibility, except where a proven security failure was caused exclusively by HubMail.",
        ],
      },
      {
        title: "4. Email content and data",
        body: [
          "Message content, attachments, metadata, and settings managed by the platform belong to their respective owners or administrators of the connected environment.",
          "You confirm that you are authorized to process, store, view, and administer the email data configured in HubMail.",
        ],
      },
      {
        title: "5. Availability and changes",
        body: [
          "We may update, interrupt, or change features to maintain security, fix issues, improve the experience, or meet technical and legal requirements.",
          "Although we pursue high availability, HubMail may be temporarily unavailable due to maintenance, incidents, infrastructure limits, or third-party dependencies.",
        ],
      },
      {
        title: "6. Limitation of liability",
        body: [
          "To the extent permitted by law, HubMail is not responsible for indirect losses, lost profits, external outages, integrated provider failures, or damages caused by misuse of the platform.",
          "You are responsible for maintaining backups, retention policies, access controls, and appropriate settings for your email environment.",
        ],
      },
      {
        title: "7. Updates to these terms",
        body: [
          "These Terms of Use may be updated periodically. The current version will always be published on this page with the latest update date.",
          "Continuing to use the platform after changes means you accept the revised terms.",
        ],
      },
      {
        title: "8. Contact",
        body: ["For questions about these terms, contact the team responsible for administering your HubMail environment."],
      },
    ],
  },
  "es-ES": {
    title: "Términos de Uso",
    description:
      "Lee las reglas y responsabilidades aplicables al uso de HubMail, incluyendo acceso al webmail, panel administrativo, integraciones y funciones de operación.",
    updatedAt: "24 de abril de 2026",
    metadataDescription: "Términos de Uso de la plataforma HubMail.",
    sections: [
      {
        title: "1. Aceptación de los términos",
        body: [
          "Al acceder o utilizar HubMail, declaras que has leído, entendido y aceptas estos Términos de Uso. Si no estás de acuerdo con alguna condición, no utilices la plataforma.",
          "Estos términos se aplican al panel, webmail, recursos administrativos, integraciones y demás funcionalidades disponibles en HubMail.",
        ],
      },
      {
        title: "2. Uso de la plataforma",
        body: [
          "Debes usar HubMail solo para fines lícitos, respetando las leyes aplicables, derechos de terceros y políticas de proveedores conectados a tu infraestructura de email.",
          "Está prohibido usar la plataforma para spam, phishing, malware, contenido ilegal, intentos de acceso no autorizado o cualquier actividad que pueda comprometer la seguridad, reputación o disponibilidad del servicio.",
        ],
      },
      {
        title: "3. Cuenta y credenciales",
        body: [
          "Eres responsable de mantener la confidencialidad de credenciales, tokens, claves API y configuraciones administrativas asociadas a tu cuenta.",
          "Toda actividad realizada con tus credenciales será considerada tu responsabilidad, salvo cuando exista una falla de seguridad comprobada causada exclusivamente por HubMail.",
        ],
      },
      {
        title: "4. Contenido y datos de email",
        body: [
          "El contenido de mensajes, adjuntos, metadatos y configuraciones gestionadas por la plataforma pertenece a sus respectivos titulares o administradores del entorno conectado.",
          "Declaras tener autorización para procesar, almacenar, visualizar y administrar los datos de email configurados en HubMail.",
        ],
      },
      {
        title: "5. Disponibilidad y cambios",
        body: [
          "Podemos actualizar, interrumpir o modificar funcionalidades para mantener la seguridad, corregir fallas, mejorar la experiencia o adecuar la plataforma a requisitos técnicos y legales.",
          "Aunque buscamos alta disponibilidad, HubMail puede estar temporalmente indisponible por mantenimiento, incidentes, limitaciones de infraestructura o dependencias de terceros.",
        ],
      },
      {
        title: "6. Limitación de responsabilidad",
        body: [
          "En la medida permitida por la ley, HubMail no será responsable por pérdidas indirectas, lucro cesante, interrupciones externas, fallas de proveedores integrados o daños derivados del uso indebido de la plataforma.",
          "Eres responsable de mantener backups, políticas de retención, controles de acceso y configuraciones adecuadas para tu entorno de email.",
        ],
      },
      {
        title: "7. Actualizaciones de estos términos",
        body: [
          "Estos Términos de Uso pueden actualizarse periódicamente. La versión vigente siempre será publicada en esta página con la fecha de última actualización.",
          "El uso continuo de la plataforma después de cambios significa que aceptas los términos revisados.",
        ],
      },
      {
        title: "8. Contacto",
        body: ["Para dudas sobre estos términos, contacta al equipo responsable de administrar tu entorno HubMail."],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = termsCopy[locale];

  return {
    title: `${copy.title} | HubMail`,
    description: copy.metadataDescription,
  };
}

export default async function TermsPage() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  const copy = termsCopy[locale];

  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      updatedAt={copy.updatedAt}
      sections={copy.sections}
      backHomeLabel={messages.legal.backHome}
      eyebrowLabel={messages.legal.eyebrow}
      updatedAtLabel={messages.legal.updatedAt}
    />
  );
}
