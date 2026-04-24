import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Automation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import type { CreateAutomationDto, UpdateAutomationDto } from './dto/automation.dto';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

type AutomationAction =
  | { type: 'forward-webhook'; url: string; secret?: string }
  | { type: 'label'; name: string }
  | { type: 'move'; mailboxId: string }
  | { type: 'tag'; tag: string }
  | Record<string, unknown>;

@Injectable()
export class AutomationsService {
  private readonly log = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  list(workspaceId: string): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, dto: CreateAutomationDto): Promise<Automation> {
    const automation = await this.prisma.automation.create({
      data: {
        workspaceId,
        name: dto.name,
        trigger: dto.trigger,
        conditions: (dto.conditions ?? {}) as Prisma.InputJsonValue,
        actions: (dto.actions ?? []) as unknown as Prisma.InputJsonValue,
        enabled: dto.enabled ?? true,
      },
    });
    this.log.log(
      `${c.green}🪄 Automation criada "${automation.name}" (${automation.trigger})${c.reset}`,
    );
    return automation;
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateAutomationDto,
  ): Promise<Automation> {
    const current = await this.prisma.automation.findFirst({
      where: { id, workspaceId },
    });
    if (!current) throw new NotFoundException('Automation não encontrada');
    const data: Prisma.AutomationUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.trigger !== undefined) data.trigger = dto.trigger;
    if (dto.conditions !== undefined) data.conditions = dto.conditions as Prisma.InputJsonValue;
    if (dto.actions !== undefined) data.actions = dto.actions as unknown as Prisma.InputJsonValue;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    return this.prisma.automation.update({ where: { id }, data });
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const current = await this.prisma.automation.findFirst({
      where: { id, workspaceId },
    });
    if (!current) throw new NotFoundException('Automation não encontrada');
    await this.prisma.automation.delete({ where: { id } });
  }

  /**
   * Runs the rules engine for a given InboxEvent. Called by the MailIngestWorker.
   */
  async runForEvent(eventId: string): Promise<void> {
    const event = await this.prisma.inboxEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    const triggerMap: Record<string, string> = {
      RECEIVED: 'MAIL_RECEIVED',
      DELIVERED: 'MAIL_RECEIVED',
      BOUNCED: 'MAIL_BOUNCED',
    };
    const trigger = triggerMap[event.type];
    if (!trigger) return;

    const rules = await this.prisma.automation.findMany({
      where: {
        workspaceId: event.workspaceId,
        trigger: trigger as never,
        enabled: true,
      },
    });

    this.log.log(
      `${c.cyan}⚙️  ${rules.length} automação(ões) candidatas para evento ${eventId}${c.reset}`,
    );

    for (const rule of rules) {
      if (!this.conditionsMatch(rule.conditions as Record<string, unknown>, event.payload)) {
        continue;
      }
      const actions = (rule.actions as unknown as AutomationAction[]) ?? [];
      for (const action of actions) {
        await this.dispatch(action, event);
      }
    }
  }

  private conditionsMatch(
    conditions: Record<string, unknown> | null | undefined,
    payload: unknown,
  ): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    const data = (payload ?? {}) as Record<string, unknown>;
    for (const [key, expected] of Object.entries(conditions)) {
      const value = data[key];
      if (typeof expected === 'string' && typeof value === 'string') {
        if (!value.toLowerCase().includes(expected.toLowerCase())) return false;
      } else if (value !== expected) {
        return false;
      }
    }
    return true;
  }

  private async dispatch(
    action: AutomationAction,
    event: { id: string; workspaceId: string; payload: unknown },
  ): Promise<void> {
    const type = (action as { type?: string }).type ?? 'unknown';
    this.log.log(
      `${c.magenta}🎬 Action=${type} evento=${event.id}${c.reset}`,
    );
    if (type === 'forward-webhook') {
      const { url, secret } = action as { url: string; secret?: string };
      if (!url) {
        this.log.warn(`${c.yellow}⚠️  forward-webhook sem url — ignorado${c.reset}`);
        return;
      }
      await this.queue.enqueueWebhookDispatch({
        url,
        secret,
        payload: { eventId: event.id, data: event.payload },
      });
      return;
    }
    this.log.warn(
      `${c.yellow}⚠️  Action type="${type}" ainda sem handler real${c.reset}`,
    );
  }
}
