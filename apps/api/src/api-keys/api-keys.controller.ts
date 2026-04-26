import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import type { User } from '@supabase/supabase-js';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.apiKeys.list(ws.workspaceId);
  }

  @Post()
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeys.create(ws.workspaceId, user.id, dto.name, dto.scopes);
  }

  @Delete(':id')
  revoke(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.apiKeys.revoke(ws.workspaceId, id, user.id);
  }
}
