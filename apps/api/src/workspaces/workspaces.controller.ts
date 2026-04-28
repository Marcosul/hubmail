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
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de workspace por ID' })
  getById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomeia workspace (apenas OWNER ou ADMIN)' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Get(':id/resources/count')
  @ApiOperation({ summary: 'Conta recursos vinculados ao workspace (domínios, inboxes, webhooks)' })
  countResources(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.countResources(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga workspace permanentemente (apenas OWNER)' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
