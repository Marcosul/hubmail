import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { AgentsService } from './agents.service';
import {
  CreateAgentDto,
  RunAgentDto,
  SetBudgetDto,
  UpdateAgentDto,
} from './dto/agent.dto';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista agentes do workspace' })
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.agents.list(ws.workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria agente' })
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateAgentDto,
  ) {
    return this.agents.create(ws.workspaceId, user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza agente' })
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agents.update(ws.workspaceId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove agente' })
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.agents.remove(ws.workspaceId, user.id, id);
  }

  @Get('budget/current')
  @ApiOperation({ summary: 'Orçamento actual do workspace' })
  getBudget(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.agents.getBudget(ws.workspaceId);
  }

  @Post('budget')
  @ApiOperation({ summary: 'Define/atualiza orçamento mensal para agentes' })
  setBudget(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: SetBudgetDto,
  ) {
    return this.agents.setBudget(ws.workspaceId, user.id, dto);
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'Histórico de execuções do agente' })
  runs(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.agents.listRuns(
      ws.workspaceId,
      id,
      limit ? Math.max(1, Math.min(200, Number(limit))) : 50,
    );
  }

  @Post(':id/runs')
  @ApiOperation({ summary: 'Dispara uma execução (dry-run por default)' })
  run(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RunAgentDto,
  ) {
    return this.agents.run(ws.workspaceId, user.id, id, dto);
  }
}
