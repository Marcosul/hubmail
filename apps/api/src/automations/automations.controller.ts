import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto, UpdateAutomationDto } from './dto/automation.dto';

@ApiTags('automations')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista automações do workspace' })
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.automations.list(ws.workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma automação' })
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automations.create(ws.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma automação' })
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automations.update(ws.workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove uma automação' })
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.automations.remove(ws.workspaceId, id);
  }
}
