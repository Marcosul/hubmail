import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Webhook, WebhookEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { StalwartWebhooksAdapter } from './stalwart-webhooks.helper';

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

function publicShape(w: Webhook) {
  return {
    id: w.id,
    url: w.url,
    description: w.description,
    events: w.events,
    enabled: w.enabled,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

@Injectable()
export class WebhooksService {
  private readonly log = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stalwart: StalwartWebhooksAdapter,
  ) {}

  async list(workspaceId: string) {
    const items = await this.prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(publicShape);
  }

  async create(workspaceId: string, actor: string, dto: CreateWebhookDto) {
    const secret = dto.secret ?? generateSecret();
    const events = (dto.events ?? []) as WebhookEventType[];
    const enabled = dto.enabled ?? true;
    const created = await this.prisma.webhook.create({
      data: {
        workspaceId,
        url: dto.url,
        description: dto.description ?? null,
        events,
        enabled,
        secret,
      },
    });

    let stalwartId: string | null = null;
    if (this.stalwart.isConfigured()) {
      stalwartId = await this.stalwart.create({
        url: dto.url,
        signatureKey: secret,
        events,
        enabled,
        description: dto.description ?? null,
      });
      if (stalwartId) {
        await this.prisma.webhook.update({
          where: { id: created.id },
          data: { stalwartId },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'webhook.created',
        subjectType: 'Webhook',
        subjectId: created.id,
        data: { url: created.url, events, stalwartId },
      },
    });

    return { ...publicShape(created), secret };
  }

  async update(workspaceId: string, id: string, actor: string, dto: UpdateWebhookDto) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        url: dto.url ?? undefined,
        description: dto.description ?? undefined,
        events: dto.events ? (dto.events as WebhookEventType[]) : undefined,
        enabled: dto.enabled ?? undefined,
      },
    });

    if (this.stalwart.isConfigured()) {
      if (updated.stalwartId) {
        const ok = await this.stalwart.update(updated.stalwartId, {
          url: updated.url,
          signatureKey: updated.secret,
          events: updated.events,
          enabled: updated.enabled,
          description: updated.description,
        });
        if (!ok) {
          this.log.warn(
            `Webhook ${id} desincronizado do Stalwart (update falhou; stalwartId=${updated.stalwartId})`,
          );
        }
      } else {
        // Sem stalwartId — tenta criar agora (recuperação de falha anterior).
        const newId = await this.stalwart.create({
          url: updated.url,
          signatureKey: updated.secret,
          events: updated.events,
          enabled: updated.enabled,
          description: updated.description,
        });
        if (newId) {
          await this.prisma.webhook.update({
            where: { id },
            data: { stalwartId: newId },
          });
        }
      }
    }

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'webhook.updated',
        subjectType: 'Webhook',
        subjectId: id,
        data: { changes: dto as never },
      },
    });

    return publicShape(updated);
  }

  async remove(workspaceId: string, id: string, actor: string) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    if (existing.stalwartId && this.stalwart.isConfigured()) {
      const ok = await this.stalwart.destroy(existing.stalwartId);
      if (!ok) {
        this.log.warn(
          `Webhook ${id} removido do hubmail mas Stalwart destroy falhou (stalwartId=${existing.stalwartId})`,
        );
      }
    }

    await this.prisma.webhook.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'webhook.deleted',
        subjectType: 'Webhook',
        subjectId: id,
        data: { url: existing.url, stalwartId: existing.stalwartId },
      },
    });
    return { ok: true };
  }

  async rotateSecret(workspaceId: string, id: string, actor: string) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    const secret = generateSecret();
    const updated = await this.prisma.webhook.update({
      where: { id },
      data: { secret },
    });

    if (updated.stalwartId && this.stalwart.isConfigured()) {
      await this.stalwart.update(updated.stalwartId, {
        url: updated.url,
        signatureKey: secret,
        events: updated.events,
        enabled: updated.enabled,
        description: updated.description,
      });
    }

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action: 'webhook.secret_rotated',
        subjectType: 'Webhook',
        subjectId: id,
        data: {},
      },
    });
    return { ok: true, secret };
  }

  async listEvents(workspaceId: string, opts: { eventType?: WebhookEventType; limit?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const events = await this.prisma.webhookEvent.findMany({
      where: {
        workspaceId,
        ...(opts.eventType ? { eventType: opts.eventType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      messageId: e.messageId,
      createdAt: e.createdAt,
    }));
  }

  async getEvent(workspaceId: string, eventId: string) {
    const event = await this.prisma.webhookEvent.findFirst({
      where: { id: eventId, workspaceId },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const attempts = await this.prisma.webhookAttempt.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      id: event.id,
      eventType: event.eventType,
      messageId: event.messageId,
      payload: event.payload,
      createdAt: event.createdAt,
      attempts: attempts.map((a) => ({
        id: a.id,
        webhookId: a.webhookId,
        url: a.url,
        status: a.status,
        statusCode: a.statusCode,
        attempt: a.attempt,
        durationMs: a.durationMs,
        errorMessage: a.errorMessage,
        createdAt: a.createdAt,
      })),
    };
  }

  async activity(workspaceId: string, hours = 6) {
    const since = new Date(Date.now() - hours * 3600_000);
    const attempts = await this.prisma.webhookAttempt.findMany({
      where: {
        webhook: { workspaceId },
        createdAt: { gte: since },
      },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const succeeded = attempts.filter((a) => a.status === 'SUCCEEDED').length;
    const failed = attempts.filter((a) => a.status === 'FAILED').length;
    return {
      windowHours: hours,
      since: since.toISOString(),
      succeeded,
      failed,
      total: attempts.length,
      attempts: attempts.map((a) => ({ status: a.status, createdAt: a.createdAt })),
    };
  }

  /** Acesso interno (com secret) usado pelo dispatcher. NÃO expor via REST. */
  async getInternal(id: string) {
    return this.prisma.webhook.findUnique({ where: { id } });
  }
}
