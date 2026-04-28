import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { CreateMailGroupDto, UpdateMailGroupDto } from './dto/mail-group.dto';
import { MailGroupsService } from './mail-groups.service';

@ApiTags('mail-groups')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('mail-groups')
export class MailGroupsController {
  constructor(private readonly service: MailGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista grupos de email do workspace' })
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.service.list(ws.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de um grupo' })
  details(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.service.getDetails(ws.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um grupo de email no Stalwart' })
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateMailGroupDto,
  ) {
    return this.service.create(ws.workspaceId, user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza grupo (nome, descrição, membros)' })
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateMailGroupDto,
  ) {
    return this.service.update(ws.workspaceId, id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove grupo (Stalwart + Prisma)' })
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.remove(ws.workspaceId, id, user.id);
  }
}
