import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import type { User } from '@supabase/supabase-js';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/domain.dto';

@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('domains')
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.domains.list(ws.workspaceId);
  }

  @Get('plan')
  planInfo(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.domains.getPlanInfo(ws.workspaceId);
  }

  @Get(':id/setup')
  setup(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.domains.getSetup(ws.workspaceId, id);
  }

  @Post()
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateDomainDto,
  ) {
    return this.domains.create(ws.workspaceId, user.id, dto.name, dto.aliases);
  }

  @Post(':id/verify')
  verify(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.domains.verify(ws.workspaceId, id);
  }

  @Delete(':id')
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.domains.remove(ws.workspaceId, id, user.id);
  }
}
