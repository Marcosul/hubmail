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

  private parsePortList(raw: string | undefined): number[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isInteger(entry) && entry > 0 && entry <= 65535);
  }

  private buildTransporter(
    auth: { user: string; pass: string },
    port: number,
  ): Transporter {
    const host = this.config.get<string>('STALWART_SMTP_HOST')?.trim();
    if (!host) {
      throw new BadGatewayException('Defina STALWART_SMTP_HOST no .env');
    }
    return createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth,
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
      name: host,
    });
  }

  private resolvePorts(): number[] {
    const primaryPort = Number(this.config.get<string>('STALWART_SMTP_PORT') ?? 587);
    const fallbackPorts = this.parsePortList(
      this.config.get<string>('STALWART_SMTP_FALLBACK_PORTS'),
    );
    const ordered = [primaryPort, ...fallbackPorts, 465].filter((port, index, list) => {
      if (!Number.isInteger(port) || port <= 0 || port > 65535) return false;
      return list.indexOf(port) === index;
    });
    return ordered.length ? ordered : [587, 465];
  }

  private async trySendOnPort(
    auth: { user: string; pass: string },
    env: SmtpEnvelope,
    port: number,
  ) {
    const transporter = this.buildTransporter(auth, port);
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
      this.log.log(`${c.green}🚀${c.reset} enviado na porta ${port}: ${info.messageId ?? '(sem id)'}`);
      return {
        messageId: info.messageId ?? null,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } finally {
      transporter.close();
    }
  }

  async send(auth: { user: string; pass: string }, env: SmtpEnvelope) {
    this.log.log(
      `${c.cyan}✉️${c.reset}  SMTP send from=${env.from} to=${env.to.join(',')} subject=${env.subject.slice(0, 60)}`,
    );
    const ports = this.resolvePorts();
    this.log.log(`${c.cyan}🧭${c.reset} tentativas SMTP nas portas: ${ports.join(', ')}`);

    let lastError: unknown = null;
    for (const port of ports) {
      try {
        this.log.log(`${c.cyan}🔌${c.reset} tentando SMTP ${auth.user} via porta ${port}`);
        return await this.trySendOnPort(auth, env, port);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        this.log.warn(`${c.yellow}⚠️${c.reset} falha na porta ${port}: ${message}`);
      }
    }

    const finalMessage =
      lastError instanceof Error ? lastError.message : String(lastError ?? 'erro desconhecido');
    this.log.error(`${c.red}❌ SMTP falhou em todas as portas:${c.reset} ${finalMessage}`);
    throw new BadGatewayException(`SMTP falhou: ${finalMessage}`);
  }

  async verify(auth: { user: string; pass: string }) {
    const ports = this.resolvePorts();
    for (const port of ports) {
      const transporter = this.buildTransporter(auth, port);
      try {
        await transporter.verify();
        this.log.log(`${c.green}✅${c.reset} SMTP verificado para ${auth.user} na porta ${port}`);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log.warn(`${c.yellow}⚠️${c.reset} verify SMTP falhou na porta ${port}: ${message}`);
      } finally {
        transporter.close();
      }
    }
    return false;
  }
}
