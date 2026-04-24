import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

const privacyCopy = {
  "pt-BR": {
    title: "Política de Privacidade",
    description:
      "Entenda quais dados podem ser tratados pelo HubMail, para quais finalidades eles são utilizados e quais controles ajudam a proteger sua operação.",
    updatedAt: "24 de abril de 2026",
    metadataDescription: "Política de Privacidade da plataforma HubMail.",
    sections: [
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
        body: ["Para exercer direitos ou tirar dúvidas sobre privacidade, entre em contato com a equipe responsável pela administração do seu ambiente HubMail."],
      },
    ],
  },
  "en-US": {
    title: "Privacy Policy",
    description:
      "Understand which data HubMail may process, why it is used, and which controls help protect your operation.",
    updatedAt: "April 24, 2026",
    metadataDescription: "Privacy Policy for the HubMail platform.",
    sections: [
      {
        title: "1. Information we collect",
        body: [
          "We may process account information such as name, email, permissions, technical identifiers, and preferences needed for authentication, security, and HubMail operation.",
          "When the platform is connected to your email environment, message data, senders, recipients, subjects, attachments, folders, logs, and technical metadata may also be processed.",
        ],
      },
      {
        title: "2. How we use data",
        body: [
          "We use data to provide access to webmail, the admin console, metrics, domain rules, API keys, integrations, and other platform features.",
          "We also use technical information to protect accounts, investigate incidents, prevent abuse, improve stability, and comply with applicable legal or regulatory obligations.",
        ],
      },
      {
        title: "3. Legal bases",
        body: [
          "Processing may occur to perform a contract, comply with legal obligations, exercise legal rights, pursue legitimate interests in platform security and operation, or based on consent when required.",
          "When you administer third-party accounts, you must ensure that you have an appropriate legal basis and authorization to process that data in HubMail.",
        ],
      },
      {
        title: "4. Sharing",
        body: [
          "We may share data with infrastructure, authentication, database, observability, and technical service providers needed to operate HubMail.",
          "We do not sell personal data. Additional sharing may occur due to legal requirements, orders from competent authorities, or to protect platform rights, security, and integrity.",
        ],
      },
      {
        title: "5. Security",
        body: [
          "We adopt technical and organizational measures to reduce risks of improper access, loss, alteration, unauthorized disclosure, and data unavailability.",
          "No system is fully immune to incidents. We recommend strong passwords, secure authentication, permission reviews, and good administrative practices.",
        ],
      },
      {
        title: "6. Retention",
        body: [
          "We keep data as long as necessary to provide the platform, comply with legal obligations, resolve disputes, audit security, and meet the purposes described in this policy.",
          "Email data, logs, and settings may follow retention policies defined by the administrator of the connected environment.",
        ],
      },
      {
        title: "7. Data subject rights",
        body: [
          "Under applicable law, data subjects may request access, correction, deletion, portability, restriction, objection to processing, or information about data use.",
          "Some requests may depend on identity validation, the action of the environment administrator, or retentions required for legal and security reasons.",
        ],
      },
      {
        title: "8. Changes to this policy",
        body: [
          "This Privacy Policy may be updated to reflect legal, technical, or operational changes. The current version will remain available on this page.",
          "We recommend reviewing this policy periodically to understand how data is processed in HubMail.",
        ],
      },
      {
        title: "9. Contact",
        body: ["To exercise rights or ask privacy questions, contact the team responsible for administering your HubMail environment."],
      },
    ],
  },
  "es-ES": {
    title: "Política de Privacidad",
    description:
      "Entiende qué datos puede tratar HubMail, para qué finalidades se usan y qué controles ayudan a proteger tu operación.",
    updatedAt: "24 de abril de 2026",
    metadataDescription: "Política de Privacidad de la plataforma HubMail.",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: [
          "Podemos tratar información de cuenta, como nombre, email, permisos, identificadores técnicos y preferencias necesarias para autenticación, seguridad y operación de HubMail.",
          "Cuando la plataforma se conecta a tu entorno de email, también pueden procesarse datos de mensajes, remitentes, destinatarios, asuntos, adjuntos, carpetas, logs y metadatos técnicos.",
        ],
      },
      {
        title: "2. Cómo usamos los datos",
        body: [
          "Usamos los datos para ofrecer acceso al webmail, panel administrativo, métricas, reglas de dominio, claves API, integraciones y demás funcionalidades de la plataforma.",
          "También usamos información técnica para proteger cuentas, investigar incidentes, prevenir abuso, mejorar la estabilidad y cumplir obligaciones legales o regulatorias aplicables.",
        ],
      },
      {
        title: "3. Bases legales",
        body: [
          "El tratamiento puede ocurrir para ejecutar un contrato, cumplir obligaciones legales, ejercer derechos, atender intereses legítimos en la seguridad y operación de la plataforma o mediante consentimiento cuando sea necesario.",
          "Cuando administras cuentas de terceros, debes garantizar que tienes base legal y autorización adecuada para tratar esos datos en HubMail.",
        ],
      },
      {
        title: "4. Compartición",
        body: [
          "Podemos compartir datos con proveedores de infraestructura, autenticación, base de datos, observabilidad y servicios técnicos necesarios para operar HubMail.",
          "No vendemos datos personales. Comparticiones adicionales pueden ocurrir por exigencia legal, orden de autoridad competente o para proteger derechos, seguridad e integridad de la plataforma.",
        ],
      },
      {
        title: "5. Seguridad",
        body: [
          "Adoptamos medidas técnicas y organizacionales para reducir riesgos de acceso indebido, pérdida, alteración, divulgación no autorizada e indisponibilidad de datos.",
          "Ningún sistema es completamente inmune a incidentes. Recomendamos contraseñas fuertes, autenticación segura, revisión de permisos y buenas prácticas de administración.",
        ],
      },
      {
        title: "6. Retención",
        body: [
          "Mantenemos datos durante el tiempo necesario para proporcionar la plataforma, cumplir obligaciones legales, resolver disputas, auditar seguridad y atender las finalidades descritas en esta política.",
          "Datos de email, logs y configuraciones pueden seguir políticas de retención definidas por el administrador del entorno conectado.",
        ],
      },
      {
        title: "7. Derechos de los titulares",
        body: [
          "Según la legislación aplicable, los titulares pueden solicitar acceso, corrección, eliminación, portabilidad, limitación, oposición al tratamiento o información sobre el uso de sus datos.",
          "Algunas solicitudes pueden depender de validación de identidad, actuación del administrador del entorno o retenciones necesarias por motivos legales y de seguridad.",
        ],
      },
      {
        title: "8. Cambios en esta política",
        body: [
          "Esta Política de Privacidad puede actualizarse para reflejar cambios legales, técnicos u operativos. La versión vigente permanecerá disponible en esta página.",
          "Recomendamos revisar esta política periódicamente para entender cómo se tratan los datos en HubMail.",
        ],
      },
      {
        title: "9. Contacto",
        body: ["Para ejercer derechos o resolver dudas de privacidad, contacta al equipo responsable de administrar tu entorno HubMail."],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const copy = privacyCopy[locale];

  return {
    title: `${copy.title} | HubMail`,
    description: copy.metadataDescription,
  };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  const copy = privacyCopy[locale];

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
