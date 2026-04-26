import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import {
  CreateMailboxApiDto,
  RotateCredentialDto,
} from './dto/create-mailbox.dto';
import { AddSavedLabelsDto } from './dto/add-saved-labels.dto';
import { MailboxesService } from './mailboxes.service';

@ApiTags('mailboxes')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('mailboxes')
export class MailboxesController {
  constructor(private readonly service: MailboxesService) {}

  @Get()
  @ApiOperation({ summary: 'Mailboxes do workspace actual' })
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.service.list(ws.workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria mailbox associada a uma conta Stalwart' })
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateMailboxApiDto,
  ) {
    return this.service.create(ws.workspaceId, user.id, dto);
  }

  @Get(':id/saved-labels')
  @ApiOperation({ summary: 'Lista etiquetas guardadas para filtro (webmail)' })
  listSavedLabels(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') mailboxId: string) {
    return this.service.listSavedLabels(ws.workspaceId, mailboxId);
  }

  @Post(':id/saved-labels')
  @ApiOperation({ summary: 'Adiciona etiquetas (texto separado por vírgulas)' })
  addSavedLabels(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') mailboxId: string,
    @Body() dto: AddSavedLabelsDto,
  ) {
    return this.service.addSavedLabelsFromRaw(ws.workspaceId, mailboxId, dto.raw);
  }

  @Delete(':id/saved-labels/:labelId')
  @ApiOperation({ summary: 'Remove uma etiqueta guardada' })
  removeSavedLabel(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') mailboxId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.service.removeSavedLabel(ws.workspaceId, mailboxId, labelId);
  }

  @Post(':id/rotate-credential')
  @ApiOperation({ summary: 'Actualiza a app-password guardada (cifrada)' })
  rotate(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') mailboxId: string,
    @Body() dto: RotateCredentialDto,
  ) {
    return this.service.rotateCredential(
      ws.workspaceId,
      mailboxId,
      user.id,
      dto.password,
      dto.username,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove mailbox (apenas metadata; a conta Stalwart permanece)' })
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') mailboxId: string,
  ) {
    return this.service.remove(ws.workspaceId, mailboxId, user.id);
  }
}
