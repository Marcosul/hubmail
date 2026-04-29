import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteScope, MembershipRole, ResourceRole } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTransport } from 'nodemailer';

const DEFAULT_FROM = '"HubMail" <no-reply@hubmail.to>';

const TEMPLATES_DIR = join(__dirname, 'templates');

const ROLE_LABEL_PT: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  USER: 'Utilizador',
};

const SCOPE_INTRO_PT: Record<InviteScope, string> = {
  WORKSPACE: 'colaborar num workspace',
  DOMAIN: 'aceder a um domínio',
  MAILBOX: 'aceder a uma conta de email',
  MAIL_GROUP: 'aceder a um grupo de email',
  WEBHOOK: 'aceder a um webhook',
};

const SCOPE_BODY_PT: Record<InviteScope, (resource: string | null, ws: string) => string> = {
  WORKSPACE: (_r, ws) => `colaborar no workspace <strong>${escapeHtml(ws)}</strong>.`,
  DOMAIN: (r, ws) =>
    `aceder ao domínio <strong>${escapeHtml(r ?? '')}</strong> no workspace <strong>${escapeHtml(ws)}</strong>.`,
  MAILBOX: (r, ws) =>
    `aceder à conta <strong>${escapeHtml(r ?? '')}</strong> no workspace <strong>${escapeHtml(ws)}</strong>.`,
  MAIL_GROUP: (r, ws) =>
    `aceder ao grupo <strong>${escapeHtml(r ?? '')}</strong> no workspace <strong>${escapeHtml(ws)}</strong>.`,
  WEBHOOK: (r, ws) =>
    `aceder ao webhook <strong>${escapeHtml(r ?? '')}</strong> no workspace <strong>${escapeHtml(ws)}</strong>.`,
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadTemplate(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, name), 'utf8');
}

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

@Injectable()
export class NotificationMailService {
  private readonly log = new Logger(NotificationMailService.name);
  private inviteTemplate: string | null = null;
  private acceptedTemplate: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private loadInviteTemplate() {
    if (!this.inviteTemplate) this.inviteTemplate = loadTemplate('invite.html');
    return this.inviteTemplate;
  }
  private loadAcceptedTemplate() {
    if (!this.acceptedTemplate) this.acceptedTemplate = loadTemplate('invite-accepted.html');
    return this.acceptedTemplate;
  }

  private transport() {
    const host = this.config.get<string>('NOTIFICATION_SMTP_HOST');
    const port = Number(this.config.get<string>('NOTIFICATION_SMTP_PORT') ?? 587);
    const user = this.config.get<string>('NOTIFICATION_SMTP_USER');
    const pass = this.config.get<string>('NOTIFICATION_SMTP_PASS');
    const secureRaw = this.config.get<string>('NOTIFICATION_SMTP_SECURE');
    // Por defeito: implicit TLS para 465, STARTTLS para 587. Pode ser forçado via env.
    const secure =
      secureRaw === undefined || secureRaw === ''
        ? port === 465
        : ['1', 'true', 'yes', 'on'].includes(secureRaw.toLowerCase());
    const ignoreTLS = this.config.get<string>('NOTIFICATION_SMTP_IGNORE_TLS') === 'true';
    const requireTLS = this.config.get<string>('NOTIFICATION_SMTP_REQUIRE_TLS') === 'true';
    const tlsRejectUnauthorized =
      this.config.get<string>('NOTIFICATION_SMTP_TLS_REJECT_UNAUTHORIZED') !== 'false';

    if (!host || !user || !pass) {
      this.log.warn('NOTIFICATION_SMTP_* não configurado — emails transacionais desativados');
      return null;
    }

    return createTransport({
      host,
      port,
      secure,
      ignoreTLS,
      requireTLS,
      auth: { user, pass },
      tls: { rejectUnauthorized: tlsRejectUnauthorized, servername: host },
    });
  }

  async sendWorkspaceInvite(opts: {
    to: string;
    inviterName: string;
    workspaceName: string;
    role: MembershipRole | ResourceRole;
    scope: InviteScope;
    resourceLabel: string | null;
    message?: string | null;
    acceptUrl: string;
  }) {
    const { to, inviterName, workspaceName, role, scope, resourceLabel, message, acceptUrl } =
      opts;

    const subject = scope === InviteScope.WORKSPACE
      ? `${inviterName} convidou-o para o workspace "${workspaceName}"`
      : `${inviterName} compartilhou um recurso consigo em "${workspaceName}"`;

    const resourceLine = resourceLabel
      ? `<div><strong style="color:#111827">Recurso:</strong> ${escapeHtml(resourceLabel)}</div>`
      : '';
    const messageBlock = message
      ? `<div style="margin:16px 0;padding:14px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:14px;color:#78350f"><em>${escapeHtml(message)}</em></div>`
      : '';

    const html = render(this.loadInviteTemplate(), {
      INVITER_NAME: escapeHtml(inviterName),
      WORKSPACE_NAME: escapeHtml(workspaceName),
      SCOPE_INTRO: SCOPE_INTRO_PT[scope] ?? '',
      SCOPE_BODY: SCOPE_BODY_PT[scope](resourceLabel, workspaceName),
      ROLE_LABEL: ROLE_LABEL_PT[role] ?? String(role),
      RESOURCE_LINE: resourceLine,
      MESSAGE_BLOCK: messageBlock,
      ACCEPT_URL: acceptUrl,
    });

    await this.deliver(to, subject, html);
  }

  async sendInviteAccepted(opts: {
    to: string;
    acceptedBy: string;
    workspaceName: string;
  }) {
    const { to, acceptedBy, workspaceName } = opts;
    const subject = `${acceptedBy} aceitou o seu convite para "${workspaceName}"`;
    const html = render(this.loadAcceptedTemplate(), {
      ACCEPTED_BY: escapeHtml(acceptedBy),
      WORKSPACE_NAME: escapeHtml(workspaceName),
    });
    await this.deliver(to, subject, html);
  }

  async sendInviteResend(opts: {
    to: string;
    inviterName: string;
    workspaceName: string;
    role: MembershipRole | ResourceRole;
    scope: InviteScope;
    resourceLabel: string | null;
    message?: string | null;
    acceptUrl: string;
  }) {
    await this.sendWorkspaceInvite(opts);
  }

  private async deliver(to: string, subject: string, html: string) {
    const from = this.config.get<string>('NOTIFICATION_SMTP_FROM') ?? DEFAULT_FROM;
    // Stalwart no nosso load-balancer ocasionalmente devolve "wrong version number"
    // — fazemos até 3 tentativas com transport novo em cada, antes de desistir.
    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const transport = this.transport();
      if (!transport) return;
      try {
        await transport.sendMail({ from, to, subject, html });
        this.log.log(
          `email transacional enviado → ${to} | ${subject.slice(0, 60)} (attempt ${attempt})`,
        );
        return;
      } catch (err) {
        lastErr = err;
        const msg = String(err);
        const transient =
          msg.includes('wrong version number') ||
          msg.includes('Greeting never received') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ETIMEDOUT');
        if (!transient || attempt === maxAttempts) break;
        this.log.warn(`SMTP tentativa ${attempt} falhou (transitório), retry…`);
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
    this.log.error(`falha ao enviar email para ${to}: ${String(lastErr)}`);
  }
}
