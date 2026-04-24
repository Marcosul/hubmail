import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const c = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
};

/**
 * AES-256-GCM envelope used to protect mail credentials (app-passwords)
 * stored in `mail_credentials.secret_ref`. The master key comes from the
 * `MAIL_CREDENTIAL_KEY` environment variable.
 *
 * Payload layout: `v1:<iv_b64>:<ciphertext_b64>:<tag_b64>`
 */
@Injectable()
export class CryptoService {
  private readonly log = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer {
    const raw = this.config.get<string>('MAIL_CREDENTIAL_KEY')?.trim();
    if (!raw) {
      this.log.warn(
        `${c.yellow}🔐 MAIL_CREDENTIAL_KEY ausente — a usar key derivada (apenas para dev)${c.reset}`,
      );
      return scryptSync('hubmail-dev-only', 'hubmail-salt', 32);
    }
    // Accept either base64 (32 bytes) or raw passphrase (derived via scrypt).
    if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 44) {
      const buf = Buffer.from(raw, 'base64');
      if (buf.length === 32) return buf;
    }
    return scryptSync(raw, 'hubmail-salt', 32);
  }

  encrypt(plaintext: string): string {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv(this.algorithm, this.getKey(), iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `v1:${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Falha ao cifrar: ${message}`);
    }
  }

  decrypt(payload: string): string {
    try {
      const [version, ivB64, ctB64, tagB64] = payload.split(':');
      if (version !== 'v1' || !ivB64 || !ctB64 || !tagB64) {
        throw new Error('Formato inválido');
      }
      const decipher = createDecipheriv(
        this.algorithm,
        this.getKey(),
        Buffer.from(ivB64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ctB64, 'base64')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Falha ao decifrar: ${message}`);
    }
  }

  hashForFingerprint(payload: string): string {
    return Buffer.from(payload).toString('base64').slice(0, 8);
  }
}
