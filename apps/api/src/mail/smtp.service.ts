import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import {
  preferIpv4FromEnv,
  resolveSmtpConnectEndpoint,
  type SmtpConnectEndpoint,
} from './smtp-connect-endpoint';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
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
  private isLikelyTlsModeMismatch(error: unknown): boolean {
    const text = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
    return (
      text.includes('wrong version number') ||
      text.includes('ssl3_get_record') ||
      text.includes('packet length too long') ||
      text.includes('tls_get_more_records') ||
      text.includes('greeting never received')
    );
  }

  constructor(private readonly config: ConfigService) {}

  private parsePortList(raw: string | undefined): number[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isInteger(entry) && entry > 0 && entry <= 65535);
  }

  /**
   * Implicit TLS (SMTPS) only on ports that normally speak TLS from the first byte.
   * STALWART_SMTP_SECURE=true|false overrides (e.g. TLS wrapper on 587, or plain 465).
   */
  private useImplicitTls(port: number): boolean {
    const raw = this.config.get<string>('STALWART_SMTP_SECURE')?.trim().toLowerCase();
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return port === 465 || port === 2465;
  }

  /** STARTTLS after EHLO — typical for submission; never with implicit TLS. */
  private useRequireTls(port: number, implicitTls: boolean): boolean {
    if (implicitTls) return false;
    const raw = this.config.get<string>('STALWART_SMTP_REQUIRE_TLS')?.trim().toLowerCase();
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return [587, 2525, 2587].includes(port);
  }

  private getConfiguredHost(): string {
    const host = this.config.get<string>('STALWART_SMTP_HOST')?.trim();
    if (!host) {
      throw new BadGatewayException('Defina STALWART_SMTP_HOST no .env');
    }
    return host;
  }

  private async resolveEndpoint(): Promise<SmtpConnectEndpoint> {
    const logical = this.getConfiguredHost();
    const prefer = preferIpv4FromEnv(this.config.get<string>('STALWART_SMTP_PREFER_IPV4'));
    const endpoint = await resolveSmtpConnectEndpoint(logical, prefer);
    if (endpoint.servername) {
      this.log.log(
        `${c.cyan}🌐${c.reset} SMTP endpoint: ${c.magenta}${logical}${c.reset} → ${c.magenta}${endpoint.host}${c.reset} (SNI ${c.magenta}${endpoint.servername}${c.reset})`,
      );
    } else {
      this.log.log(`${c.cyan}🌐${c.reset} SMTP endpoint: ${c.magenta}${endpoint.host}${c.reset}`);
    }
    return endpoint;
  }

  private buildTransporter(
    auth: { user: string; pass: string },
    port: number,
    options: { secureOverride?: boolean; endpoint: SmtpConnectEndpoint },
  ): Transporter {
    const { endpoint } = options;
    const secure = options.secureOverride ?? this.useImplicitTls(port);
    const requireTLS = this.useRequireTls(port, secure);
    const tls = endpoint.servername ? { servername: endpoint.servername } : undefined;
    this.log.log(
      `${c.magenta}🔐${c.reset} SMTP socket host=${endpoint.host} port=${port} secure=${secure} requireTLS=${requireTLS}`,
    );
    return createTransport({
      host: endpoint.host,
      ...(endpoint.servername ? { servername: endpoint.servername } : {}),
      port,
      secure,
      requireTLS,
      tls,
      authMethod: 'LOGIN',
      auth: {
        type: 'LOGIN',
        user: auth.user,
        pass: auth.pass,
      } as never,
      connectionTimeout: 15_000,
      greetingTimeout: 25_000,
      socketTimeout: 30_000,
    });
  }

  private resolvePorts(): number[] {
    const primaryPort = Number(this.config.get<string>('STALWART_SMTP_PORT') ?? 587);
    const fallbackPorts = this.parsePortList(this.config.get<string>('STALWART_SMTP_FALLBACK_PORTS'));
    const autoFallbackEnabledRaw = this.config
      .get<string>('STALWART_SMTP_AUTO_FALLBACK')
      ?.trim()
      .toLowerCase();
    const autoFallbackEnabled =
      autoFallbackEnabledRaw === undefined ||
      autoFallbackEnabledRaw === '' ||
      autoFallbackEnabledRaw === 'true' ||
      autoFallbackEnabledRaw === '1';
    const autoFallbackPorts = autoFallbackEnabled ? [465] : [];

    const ordered = [primaryPort, ...fallbackPorts, ...autoFallbackPorts].filter((port, index, list) => {
      if (!Number.isInteger(port) || port <= 0 || port > 65535) return false;
      return list.indexOf(port) === index;
    });
    return ordered.length ? ordered : [587];
  }

  private async trySendOnPort(
    auth: { user: string; pass: string },
    env: SmtpEnvelope,
    port: number,
    endpoint: SmtpConnectEndpoint,
  ) {
    const run = async (secureOverride?: boolean) => {
      const transporter = this.buildTransporter(auth, port, { secureOverride, endpoint });
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
    };

    try {
      return await run();
    } catch (error) {
      if (!this.isLikelyTlsModeMismatch(error)) {
        throw error;
      }
      const defaultSecure = this.useImplicitTls(port);
      this.log.warn(
        `${c.yellow}🔁${c.reset} possível mismatch TLS na porta ${port}; a tentar modo alternativo secure=${!defaultSecure}`,
      );
      return run(!defaultSecure);
    }
  }

  async send(auth: { user: string; pass: string }, env: SmtpEnvelope) {
    if (!auth.user?.trim() || !auth.pass?.trim()) {
      throw new BadGatewayException('SMTP sem credenciais válidas (username/password).');
    }
    this.log.log(
      `${c.cyan}✉️${c.reset}  SMTP send from=${env.from} to=${env.to.join(',')} subject=${env.subject.slice(0, 60)}`,
    );
    const endpoint = await this.resolveEndpoint();
    const ports = this.resolvePorts();
    this.log.log(`${c.cyan}🧭${c.reset} tentativas SMTP nas portas: ${ports.join(', ')}`);

    let lastError: unknown = null;
    const attempts: Array<{ port: number; message: string }> = [];
    for (const port of ports) {
      try {
        this.log.log(`${c.cyan}🔌${c.reset} tentando SMTP ${auth.user} via porta ${port}`);
        return await this.trySendOnPort(auth, env, port, endpoint);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        attempts.push({ port, message });
        this.log.warn(`${c.yellow}⚠️${c.reset} falha na porta ${port}: ${message}`);
      }
    }

    const preferred =
      attempts.find((a) => !a.message.toLowerCase().includes('econnrefused')) ??
      attempts[attempts.length - 1];
    const finalMessage =
      preferred?.message ??
      (lastError instanceof Error ? lastError.message : String(lastError ?? 'erro desconhecido'));
    this.log.error(`${c.red}❌ SMTP falhou em todas as portas:${c.reset} ${finalMessage}`);
    throw new BadGatewayException(`SMTP falhou: ${finalMessage}`);
  }

  async verify(auth: { user: string; pass: string }) {
    const endpoint = await this.resolveEndpoint();
    const ports = this.resolvePorts();
    for (const port of ports) {
      const transporter = this.buildTransporter(auth, port, { endpoint });
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
