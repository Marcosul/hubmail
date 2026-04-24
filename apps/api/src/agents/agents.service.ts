import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AgentStatus, type Agent, type Budget, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAgentDto,
  RunAgentDto,
  SetBudgetDto,
  UpdateAgentDto,
} from './dto/agent.dto';

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

@Injectable()
export class AgentsService {
  private readonly log = new Logger(AgentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(workspaceId: string): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    workspaceId: string,
    actor: string | null,
    dto: CreateAgentDto,
  ): Promise<Agent> {
    const agent = await this.prisma.agent.create({
      data: {
        workspaceId,
        name: dto.name,
        model: dto.model,
        systemPrompt: dto.systemPrompt,
        tools: dto.tools ?? [],
        policy: (dto.policy ?? {}) as Prisma.InputJsonValue,
        enabled: dto.enabled ?? false,
      },
    });
    this.log.log(
      `${c.green}🤖 Agent criado "${agent.name}" (model=${agent.model})${c.reset}`,
    );
    await this.audit(workspaceId, actor, 'agent.created', agent.id, {
      model: agent.model,
    });
    return agent;
  }

  async update(
    workspaceId: string,
    actor: string | null,
    id: string,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    await this.ensureOwnership(workspaceId, id);
    const data: Prisma.AgentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.systemPrompt !== undefined) data.systemPrompt = dto.systemPrompt;
    if (dto.tools !== undefined) data.tools = dto.tools;
    if (dto.policy !== undefined) data.policy = dto.policy as Prisma.InputJsonValue;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    const agent = await this.prisma.agent.update({ where: { id }, data });
    await this.audit(workspaceId, actor, 'agent.updated', id, data as never);
    return agent;
  }

  async remove(workspaceId: string, actor: string | null, id: string): Promise<void> {
    await this.ensureOwnership(workspaceId, id);
    await this.prisma.agent.delete({ where: { id } });
    await this.audit(workspaceId, actor, 'agent.deleted', id);
  }

  async getBudget(workspaceId: string): Promise<Budget | null> {
    return this.prisma.budget.findUnique({ where: { workspaceId } });
  }

  async setBudget(
    workspaceId: string,
    actor: string | null,
    dto: SetBudgetDto,
  ): Promise<Budget> {
    const budget = await this.prisma.budget.upsert({
      where: { workspaceId },
      update: { monthlyCents: dto.monthlyCents },
      create: {
        workspaceId,
        monthlyCents: dto.monthlyCents,
        usedCents: 0,
      },
    });
    await this.audit(workspaceId, actor, 'agent.budget.updated', workspaceId, {
      monthlyCents: dto.monthlyCents,
    });
    return budget;
  }

  async listRuns(workspaceId: string, agentId: string, limit = 50) {
    await this.ensureOwnership(workspaceId, agentId);
    return this.prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actions: true },
    });
  }

  async run(
    workspaceId: string,
    actor: string | null,
    agentId: string,
    dto: RunAgentDto,
  ) {
    const agent = await this.ensureOwnership(workspaceId, agentId);
    if (!agent.enabled) {
      throw new BadRequestException('Agent está desactivado');
    }
    await this.assertBudgetAvailable(workspaceId);

    const run = await this.prisma.agentRun.create({
      data: {
        agentId,
        triggerEventId: dto.triggerEventId ?? null,
        status: AgentStatus.RUNNING,
        startedAt: new Date(),
      },
    });
    this.log.log(
      `${c.magenta}🧠 Agent ${agent.name} run=${run.id} iniciado${c.reset}`,
    );

    try {
      const action = await this.prisma.agentAction.create({
        data: {
          runId: run.id,
          kind: 'plan',
          input: (dto.input ?? {}) as Prisma.InputJsonValue,
          output: {
            note:
              'Runtime AI SDK ainda não ligado. Este action serve de placeholder seguro para auditoria.',
            dryRun: dto.dryRun ?? true,
          } as Prisma.InputJsonValue,
        },
      });

      const estimatedCostCents = 0;
      const completed = await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: AgentStatus.COMPLETED,
          endedAt: new Date(),
          tokensIn: 0,
          tokensOut: 0,
          costCents: estimatedCostCents,
        },
        include: { actions: true },
      });

      await this.prisma.budget.update({
        where: { workspaceId },
        data: { usedCents: { increment: estimatedCostCents } },
      }).catch(() => undefined);

      await this.audit(workspaceId, actor, 'agent.run.completed', agentId, {
        runId: run.id,
        actionId: action.id,
        costCents: estimatedCostCents,
      });
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: { status: AgentStatus.FAILED, endedAt: new Date() },
      });
      await this.audit(workspaceId, actor, 'agent.run.failed', agentId, {
        runId: run.id,
        error: message,
      });
      throw error;
    }
  }

  private async ensureOwnership(workspaceId: string, agentId: string): Promise<Agent> {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent não encontrado neste workspace');
    return agent;
  }

  private async assertBudgetAvailable(workspaceId: string): Promise<void> {
    const budget = await this.prisma.budget.findUnique({ where: { workspaceId } });
    if (!budget) return;
    if (budget.monthlyCents === 0) return;
    if (budget.usedCents >= budget.monthlyCents) {
      this.log.warn(
        `${c.yellow}⚠️  Budget esgotado workspace=${workspaceId} used=${budget.usedCents}/${budget.monthlyCents}${c.reset}`,
      );
      throw new ForbiddenException('Budget mensal para agentes foi atingido');
    }
  }

  private audit(
    workspaceId: string,
    actor: string | null,
    action: string,
    subjectId: string,
    data: Record<string, unknown> = {},
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId,
        actor,
        action,
        subjectType: 'Agent',
        subjectId,
        data: data as never,
      },
    });
  }
}
