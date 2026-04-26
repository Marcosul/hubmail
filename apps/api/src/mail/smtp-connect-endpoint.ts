import * as dns from 'node:dns/promises';
import * as net from 'node:net';

export type SmtpConnectEndpoint = {
  host: string;
  /**
   * Quando ligamos por IP literal, o nodemailer precisa disto para SNI/STARTTLS.
   * Omitido quando `host` já é o hostname DNS.
   */
  servername?: string;
};

/**
 * Evita escolha aleatória IPv4/IPv6 do nodemailer (resolveHostname + endereço aleatório),
 * que em redes com IPv6 partido provoca "Greeting never received" / ETIMEDOUT.
 */
export async function resolveSmtpConnectEndpoint(
  hostname: string,
  preferIpv4: boolean,
): Promise<SmtpConnectEndpoint> {
  const logical = hostname.trim();
  if (!logical) {
    throw new Error('SMTP host vazio');
  }
  if (net.isIP(logical)) {
    return { host: logical };
  }
  if (!preferIpv4) {
    return { host: logical };
  }
  try {
    const v4 = await dns.resolve4(logical);
    if (v4[0]) {
      return { host: v4[0], servername: logical };
    }
  } catch {
    // Sem registo A (só AAAA ou NXDOMAIN transitório): hostname original
  }
  return { host: logical };
}

export function preferIpv4FromEnv(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'false' || v === '0') return false;
  if (v === '6' || v === 'ipv6') return false;
  return true;
}
