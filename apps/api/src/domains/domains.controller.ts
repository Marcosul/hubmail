import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import type { User } from '@supabase/supabase-js';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/domain.dto';

@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('domains')
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list(@CurrentWorkspace() wsId: string) {
    return this.domains.list(wsId);
  }

  @Get('plan')
  planInfo(@CurrentWorkspace() wsId: string) {
    return this.domains.getPlanInfo(wsId);
  }

  @Post()
  create(
    @CurrentWorkspace() wsId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateDomainDto,
  ) {
    return this.domains.create(wsId, user.id, dto.name);
  }

  @Post(':id/verify')
  verify(@CurrentWorkspace() wsId: string, @Param('id') id: string) {
    return this.domains.verify(wsId, id);
  }

  @Delete(':id')
  remove(
    @CurrentWorkspace() wsId: string,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.domains.remove(wsId, id, user.id);
  }
}
