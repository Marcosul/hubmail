import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista workspaces do utilizador autenticado' })
  list(@CurrentUser() user: User) {
    return this.service.listForUser(user);
  }

  @Post()
  @ApiOperation({ summary: 'Cria workspace (e organização quando não indicada)' })
  create(@CurrentUser() user: User, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(user, dto);
  }

  @Post('bootstrap')
  @ApiOperation({
    summary: 'Garante pelo menos um workspace para o utilizador (idempotente)',
  })
  bootstrap(@CurrentUser() user: User) {
    return this.service.bootstrapDefault(user);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalhe de workspace por slug' })
  getBySlug(@CurrentUser() user: User, @Param('slug') slug: string) {
    return this.service.getBySlug(user, slug);
  }
}
