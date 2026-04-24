import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('workspace')
  @ApiOperation({ summary: 'KPIs agregados do workspace (janela em horas)' })
  snapshot(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Query('hours') hours?: string,
  ) {
    const h = hours ? Math.max(1, Math.min(24 * 30, Number(hours))) : 24;
    return this.metrics.getWorkspaceSnapshot(ws.workspaceId, h);
  }
}
