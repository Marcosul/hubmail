import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto';
import { WorkspaceInvitesService } from './workspace-invites.service';

@ApiTags('workspace-invites')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('workspaces/:workspaceId/invites')
export class WorkspaceInvitesController {
  constructor(private readonly service: WorkspaceInvitesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista convites pendentes do workspace (OWNER/ADMIN)' })
  list(@CurrentUser() user: User, @Param('workspaceId') workspaceId: string) {
    return this.service.listForWorkspace(user.id, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria convite com escopo (workspace/domínio/conta/grupo/webhook)' })
  create(
    @CurrentUser() user: User,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInviteDto,
  ) {
    return this.service.create(user.id, workspaceId, dto);
  }

  @Delete(':inviteId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancela convite (OWNER/ADMIN)' })
  cancel(
    @CurrentUser() user: User,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.service.cancel(user.id, workspaceId, inviteId);
  }

  @Post(':inviteId/resend')
  @ApiOperation({ summary: 'Reenvia email de convite (OWNER/ADMIN)' })
  resend(
    @CurrentUser() user: User,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.service.resend(user.id, workspaceId, inviteId);
  }
}

@ApiTags('workspace-invites')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('invites')
export class InviteAcceptController {
  constructor(private readonly service: WorkspaceInvitesService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Convites pendentes para o email do utilizador autenticado' })
  pending(@CurrentUser() user: User) {
    const email = user.email ?? '';
    return this.service.listPendingForUser(email);
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Aceita convite por token' })
  accept(@CurrentUser() user: User, @Param('token') token: string) {
    return this.service.accept(token, user.id, user.email ?? null);
  }
}

@ApiTags('workspace-invites')
@Controller('public/invites')
export class PublicInviteController {
  constructor(private readonly service: WorkspaceInvitesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Detalhes públicos do convite (sem autenticação)' })
  getByToken(@Param('token') token: string) {
    return this.service.getPublicByToken(token);
  }
}
