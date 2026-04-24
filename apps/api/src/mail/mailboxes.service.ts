import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DomainStatus, MailCredentialKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export interface CreateMailboxDto {
  address: string;
  displayName?: string;
  password: string;
  username?: string;
}

@Injectable()
export class MailboxesService {
  private readonly log = new Logger(MailboxesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(workspaceId: string) {
    const mailboxes = await this.prisma.mailbox.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { domain: true, credential: true },
    });
    return mailboxes.map((mb) => ({
      id: mb.id,
      address: mb.address,
      displayName: mb.displayName,
      domain: mb.domain.name,
      createdAt: mb.createdAt,
      hasCredential: Boolean(mb.credentialId),
    }));
  }

  async getOrThrow(workspaceId: string, mailboxId: string) {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: mailboxId, workspaceId },
      include: { domain: true, credential: true },
    });
    if (!mailbox) {
      throw new NotFoundException('Mailbox não encontrada');
    }
    return mailbox;
  }

  async resolveCredentials(workspaceId: string, mailboxId: string) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    if (!mailbox.credential) {
      throw new BadRequestException('Mailbox sem credenciais; configure em settings');
    }
    const password = this.crypto.decrypt(mailbox.credential.secretRef);
    return {
      mailbox,
      credentials: {
        username: mailbox.credential.username ?? mailbox.address,
        password,
      },
    };
  }

  async create(workspaceId: string, actor: string, dto: CreateMailboxDto) {
    const address = dto.address.trim().toLowerCase();
    if (!address.includes('@')) {
      throw new BadRequestException('Endereço de email inválido');
    }
    const domainName = address.split('@')[1];

    const existing = await this.prisma.mailbox.findUnique({
      where: { workspaceId_address: { workspaceId, address } },
    });
    if (existing) {
      throw new ConflictException('Mailbox já existe neste workspace');
    }

    const domain = await this.prisma.domain.upsert({
      where: { workspaceId_name: { workspaceId, name: domainName } },
      update: {},
      create: {
        workspaceId,
        name: domainName,
        status: DomainStatus.PENDING,
      },
    });

    const secretRef = this.crypto.encrypt(dto.password);

    const mailbox = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mailbox.create({
        data: {
          workspaceId,
          domainId: domain.id,
          address,
          displayName: dto.displayName,
        },
      });
      const credential = await tx.mailCredential.create({
        data: {
          mailboxId: created.id,
          kind: MailCredentialKind.APP_PASSWORD,
          secretRef,
          username: dto.username ?? address,
        },
      });
      const linked = await tx.mailbox.update({
        where: { id: created.id },
        data: { credentialId: credential.id },
        include: { domain: true, credential: true },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mailbox.created',
          subjectType: 'Mailbox',
          subjectId: linked.id,
          data: { address, domain: domainName },
        },
      });
      return linked;
    });

    this.log.log(
      `${c.green}📬${c.reset} mailbox ${c.magenta}${mailbox.address}${c.reset} criada por ${c.cyan}${actor}${c.reset}`,
    );

    return {
      id: mailbox.id,
      address: mailbox.address,
      displayName: mailbox.displayName,
      domain: mailbox.domain.name,
      createdAt: mailbox.createdAt,
      hasCredential: Boolean(mailbox.credentialId),
    };
  }

  async rotateCredential(
    workspaceId: string,
    mailboxId: string,
    actor: string,
    newPassword: string,
    username?: string,
  ) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    const secretRef = this.crypto.encrypt(newPassword);
    if (mailbox.credentialId) {
      await this.prisma.mailCredential.update({
        where: { id: mailbox.credentialId },
        data: {
          secretRef,
          username: username ?? mailbox.credential?.username ?? mailbox.address,
          rotatedAt: new Date(),
        },
      });
    } else {
      const cred = await this.prisma.mailCredential.create({
        data: {
          mailboxId: mailbox.id,
          kind: MailCredentialKind.APP_PASSWORD,
          secretRef,
          username: username ?? mailbox.address,
        },
      });
      await this.prisma.mailbox.update({
        where: { id: mailbox.id },
        data: { credentialId: cred.id },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'mailbox.credentials.rotated',
        subjectType: 'Mailbox',
        subjectId: mailbox.id,
        data: {},
      },
    });
    this.log.log(
      `${c.green}🔑${c.reset} credencial rodada para ${c.magenta}${mailbox.address}${c.reset}`,
    );
    return { ok: true };
  }

  async remove(workspaceId: string, mailboxId: string, actor: string) {
    const mailbox = await this.getOrThrow(workspaceId, mailboxId);
    await this.prisma.$transaction([
      this.prisma.mailbox.delete({ where: { id: mailbox.id } }),
      this.prisma.mailCredential.deleteMany({ where: { mailboxId: mailbox.id } }),
      this.prisma.auditLog.create({
        data: {
          workspaceId,
          actor,
          action: 'mailbox.deleted',
          subjectType: 'Mailbox',
          subjectId: mailbox.id,
          data: { address: mailbox.address },
        },
      }),
    ]);
    this.log.log(`${c.magenta}🗑️  mailbox ${mailbox.address} removida${c.reset}`);
    return { ok: true };
  }
}
