import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

export interface SmtpEnvelope {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

@Injectable()
export class SmtpService {
  private readonly log = new Logger(SmtpService.name);

  constructor(private readonly config: ConfigService) {}

  private buildTransporter(auth: { user: string; pass: string }): Transporter {
    const host = this.config.get<string>('STALWART_SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('STALWART_SMTP_PORT') ?? 587);
    if (!host) {
      throw new BadGatewayException('Defina STALWART_SMTP_HOST no .env');
    }
    return createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth,
    });
  }

  async send(auth: { user: string; pass: string }, env: SmtpEnvelope) {
    const transporter = this.buildTransporter(auth);
    this.log.log(
      `${c.cyan}✉️${c.reset}  SMTP send from=${env.from} to=${env.to.join(',')} subject=${env.subject.slice(0, 60)}`,
    );
    try {
      const info = await transporter.sendMail({
        from: env.from,
        to: env.to,
        cc: env.cc,
        bcc: env.bcc,
        subject: env.subject,
        html: env.html,
        text: env.text,
        inReplyTo: env.inReplyTo,
        references: env.references,
        attachments: env.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      this.log.log(`${c.green}🚀${c.reset} enviado: ${info.messageId ?? '(sem id)'}`);
      return {
        messageId: info.messageId ?? null,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.error(`${c.red}❌ SMTP falhou:${c.reset} ${message}`);
      throw new BadGatewayException(`SMTP falhou: ${message}`);
    } finally {
      transporter.close();
    }
  }

  async verify(auth: { user: string; pass: string }) {
    const transporter = this.buildTransporter(auth);
    try {
      await transporter.verify();
      this.log.log(`${c.green}✅${c.reset} SMTP verificado para ${auth.user}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn(`${c.yellow}⚠️${c.reset} verify SMTP falhou: ${message}`);
      return false;
    } finally {
      transporter.close();
    }
  }
}
