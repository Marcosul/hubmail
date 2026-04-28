import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Webhook, WebhookEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { StalwartWebhooksAdapter } from './stalwart-webhooks.helper';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

function publicShape(w: Webhook) {
  return {
    id: w.id,
    url: w.url,
    description: w.description,
    events: w.events,
    workspaceIds: w.workspaceIds,
    inboxIds: w.inboxIds,
    clientId: w.clientId,
    headers: (w.headers ?? {}) as Record<string, string>,
    throttleMs: w.throttleMs,
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
    private readonly dispatcher: WebhookDispatcherService,
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
    const { workspaceIds, inboxIds } = await this.validateScope(
      workspaceId,
      dto.workspaceIds,
      dto.inboxIds,
    );

    const created = await this.prisma.webhook.create({
      data: {
        workspaceId,
        url: dto.url,
        description: dto.description ?? null,
        events,
        workspaceIds,
        inboxIds,
        clientId: dto.clientId ?? null,
        headers: (dto.headers ?? {}) as never,
        throttleMs: dto.throttleMs ?? null,
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

    let scopedWorkspaceIds: string[] | undefined;
    let scopedInboxIds: string[] | undefined;
    if (dto.workspaceIds !== undefined || dto.inboxIds !== undefined) {
      const v = await this.validateScope(workspaceId, dto.workspaceIds, dto.inboxIds);
      scopedWorkspaceIds = dto.workspaceIds !== undefined ? v.workspaceIds : undefined;
      scopedInboxIds = dto.inboxIds !== undefined ? v.inboxIds : undefined;
    }

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        url: dto.url ?? undefined,
        description: dto.description ?? undefined,
        events: dto.events ? (dto.events as WebhookEventType[]) : undefined,
        workspaceIds: scopedWorkspaceIds,
        inboxIds: scopedInboxIds,
        clientId: dto.clientId ?? undefined,
        headers: dto.headers !== undefined ? (dto.headers as never) : undefined,
        throttleMs: dto.throttleMs !== undefined ? dto.throttleMs : undefined,
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

  async getById(workspaceId: string, id: string) {
    const w = await this.prisma.webhook.findFirst({ where: { id, workspaceId } });
    if (!w) throw new NotFoundException('Webhook não encontrado');
    return publicShape(w);
  }

  /** Lista as tentativas de entrega de um endpoint específico. */
  async listAttempts(
    workspaceId: string,
    webhookId: string,
    opts: { status?: 'SUCCEEDED' | 'FAILED'; limit?: number },
  ) {
    const w = await this.prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId },
      select: { id: true },
    });
    if (!w) throw new NotFoundException('Webhook não encontrado');

    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const attempts = await this.prisma.webhookAttempt.findMany({
      where: {
        webhookId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { event: { select: { eventType: true, messageId: true } } },
    });
    return attempts.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      eventType: a.event.eventType,
      messageId: a.event.messageId,
      url: a.url,
      status: a.status,
      statusCode: a.statusCode,
      attempt: a.attempt,
      durationMs: a.durationMs,
      errorMessage: a.errorMessage,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Dispara um evento sintético de teste (não retriável) para o endpoint.
   * Retorna o eventId criado.
   */
  async sendTestEvent(
    workspaceId: string,
    webhookId: string,
    eventType: WebhookEventType,
  ): Promise<{ eventId: string }> {
    const w = await this.prisma.webhook.findFirst({ where: { id: webhookId, workspaceId } });
    if (!w) throw new NotFoundException('Webhook não encontrado');

    const samplePayload: Record<string, unknown> = {
      test: true,
      send: {
        message_id: `test-${Date.now()}`,
        inbox_id: null,
        recipients: ['test@example.com'],
        timestamp: new Date().toISOString(),
      },
    };

    const event = await this.prisma.webhookEvent.create({
      data: {
        workspaceId,
        eventType,
        messageId: `test-${Date.now()}`,
        payload: samplePayload as never,
      },
    });

    // Entrega direta (não-retriável) para este endpoint apenas.
    void this.dispatcher
      .deliverSingle(w.id, w.url, w.secret, event.id, {
        event_id: event.id,
        event_type: eventType,
        type: 'event',
        ...samplePayload,
      })
      .catch(() => {});

    return { eventId: event.id };
  }

  /** Acesso interno (com secret) usado pelo dispatcher. NÃO expor via REST. */
  async getInternal(id: string) {
    return this.prisma.webhook.findUnique({ where: { id } });
  }

  /**
   * Lista os workspaces da mesma organização do owner (incluindo o próprio)
   * com seus inboxes — usado pelo formulário para permitir escopar webhooks.
   */
  async listScopeOptions(workspaceId: string) {
    const owner = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (!owner) throw new NotFoundException('Workspace não encontrado');

    const workspaces = await this.prisma.workspace.findMany({
      where: { organizationId: owner.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        mailboxes: {
          orderBy: { address: 'asc' },
          select: { id: true, address: true, displayName: true },
        },
      },
    });

    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      isOwner: w.id === workspaceId,
      inboxes: w.mailboxes.map((m) => ({
        id: m.id,
        address: m.address,
        displayName: m.displayName,
      })),
    }));
  }

  /**
   * Garante que workspaceIds pertencem à organização do owner e que inboxIds
   * pertencem aos workspaces escopados (ou ao owner, se vazio).
   */
  private async validateScope(
    ownerWorkspaceId: string,
    workspaceIds: string[] | undefined,
    inboxIds: string[] | undefined,
  ): Promise<{ workspaceIds: string[]; inboxIds: string[] }> {
    const wsList = Array.from(new Set(workspaceIds ?? []));
    const inList = Array.from(new Set(inboxIds ?? []));

    if (wsList.length > 0) {
      const owner = await this.prisma.workspace.findUnique({
        where: { id: ownerWorkspaceId },
        select: { organizationId: true },
      });
      if (!owner) throw new NotFoundException('Workspace não encontrado');
      const valid = await this.prisma.workspace.findMany({
        where: {
          id: { in: wsList },
          organizationId: owner.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (valid.length !== wsList.length) {
        throw new BadRequestException(
          'workspaceIds devem pertencer à mesma organização do workspace owner',
        );
      }
    }

    if (inList.length > 0) {
      const allowedWorkspaces = wsList.length > 0 ? wsList : [ownerWorkspaceId];
      const valid = await this.prisma.mailbox.findMany({
        where: {
          id: { in: inList },
          workspaceId: { in: allowedWorkspaces },
        },
        select: { id: true },
      });
      if (valid.length !== inList.length) {
        throw new BadRequestException(
          'inboxIds devem pertencer aos workspaces escopados (ou ao owner)',
        );
      }
    }

    return { workspaceIds: wsList, inboxIds: inList };
  }
}
