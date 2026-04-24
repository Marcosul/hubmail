import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

@Injectable()
export class WebhookSignatureService {
  /**
   * Aceita três formatos de assinatura:
   *  1. Stalwart (default): `X-Signature: <base64(hmac_sha256(secret, body))>`
   *  2. GitHub-style:       `X-Signature-256: sha256=<hex>`
   *  3. Apenas hex:          `X-Signature: <hex>`
   *
   * Qualquer um que valide faz a verificação passar.
   */
  verify(
    secret: string,
    rawBody: string,
    signature: string | undefined,
  ): boolean {
    if (!signature || !secret) return false;
    const mac = createHmac('sha256', secret).update(rawBody).digest();
    const macHex = mac.toString('hex');
    const macB64 = mac.toString('base64');

    const sig = signature.trim();
    const sigNoPrefix = sig.startsWith('sha256=') ? sig.slice(7) : sig;

    if (safeEqual(Buffer.from(sigNoPrefix, 'hex'), mac)) return true;
    if (safeEqual(Buffer.from(sigNoPrefix), Buffer.from(macHex))) return true;
    if (safeEqual(Buffer.from(sigNoPrefix), Buffer.from(macB64))) return true;
    try {
      const decoded = Buffer.from(sigNoPrefix, 'base64');
      if (safeEqual(decoded, mac)) return true;
    } catch {
      // ignore
    }
    return false;
  }
}
