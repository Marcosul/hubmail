import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw = `hm_${randomBytes(24).toString('base64url')}`;
  const prefix = raw.slice(0, 10);
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}

@Injectable()
export class ApiKeysService {
  private readonly log = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async create(workspaceId: string, actor: string, name: string, scopes: string[] = []) {
    const { raw, prefix, hash } = generateKey();

    const key = await this.prisma.apiKey.create({
      data: { workspaceId, name, hash, prefix, scopes },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'api_key.created',
        subjectType: 'ApiKey',
        subjectId: key.id,
        data: { name, prefix },
      },
    });

    this.log.log(`API key "${name}" (${prefix}) created for workspace ${workspaceId}`);

    return { id: key.id, name: key.name, prefix, key: raw, createdAt: key.createdAt };
  }

  async revoke(workspaceId: string, keyId: string, actor: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, workspaceId, revokedAt: null },
    });
    if (!key) throw new NotFoundException('Chave de API não encontrada');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'api_key.revoked',
        subjectType: 'ApiKey',
        subjectId: keyId,
        data: { prefix: key.prefix },
      },
    });

    return { ok: true };
  }
}
