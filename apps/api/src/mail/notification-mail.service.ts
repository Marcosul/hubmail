import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

const FROM = '"HubMail" <no-reply@hubmail.to>';

@Injectable()
export class NotificationMailService {
  private readonly log = new Logger(NotificationMailService.name);

  constructor(private readonly config: ConfigService) {}

  private transport() {
    const host = this.config.get<string>('NOTIFICATION_SMTP_HOST');
    const port = Number(this.config.get<string>('NOTIFICATION_SMTP_PORT') ?? 587);
    const user = this.config.get<string>('NOTIFICATION_SMTP_USER');
    const pass = this.config.get<string>('NOTIFICATION_SMTP_PASS');

    if (!host || !user || !pass) {
      this.log.warn('NOTIFICATION_SMTP_* não configurado — emails transacionais desativados');
      return null;
    }

    return createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }

  async sendWorkspaceInvite(opts: {
    to: string;
    inviterName: string;
    workspaceName: string;
    role: string;
    message?: string | null;
    acceptUrl: string;
  }) {
    const { to, inviterName, workspaceName, role, message, acceptUrl } = opts;
    const subject = `${inviterName} convidou-o para o workspace "${workspaceName}"`;
    const html = `
      <p>Olá,</p>
      <p><strong>${inviterName}</strong> convidou-o para colaborar no workspace
         <strong>${workspaceName}</strong> com a função <strong>${role}</strong>.</p>
      ${message ? `<blockquote>${message}</blockquote>` : ''}
      <p><a href="${acceptUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Aceitar convite</a></p>
      <p style="color:#6b7280;font-size:12px">O convite expira em 7 dias. Se não reconhece este pedido, ignore este email.</p>
    `;
    await this.deliver(to, subject, html);
  }

  async sendInviteAccepted(opts: {
    to: string;
    acceptedBy: string;
    workspaceName: string;
  }) {
    const { to, acceptedBy, workspaceName } = opts;
    const subject = `${acceptedBy} aceitou o seu convite para "${workspaceName}"`;
    const html = `
      <p>Olá,</p>
      <p><strong>${acceptedBy}</strong> aceitou o convite e é agora membro do workspace
         <strong>${workspaceName}</strong>.</p>
    `;
    await this.deliver(to, subject, html);
  }

  async sendInviteResend(opts: {
    to: string;
    inviterName: string;
    workspaceName: string;
    role: string;
    message?: string | null;
    acceptUrl: string;
  }) {
    await this.sendWorkspaceInvite(opts);
  }

  private async deliver(to: string, subject: string, html: string) {
    const transport = this.transport();
    if (!transport) return;
    try {
      await transport.sendMail({ from: FROM, to, subject, html });
      this.log.log(`email transacional enviado → ${to} | ${subject.slice(0, 60)}`);
    } catch (err) {
      this.log.error(`falha ao enviar email para ${to}: ${String(err)}`);
    }
  }
}
