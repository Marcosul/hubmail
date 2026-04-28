import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { ResourceRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { ResourceAccessService } from './resource-access.service';

class UpdateAccessRoleDto {
  @IsEnum(ResourceRole)
  role!: ResourceRole;
}

@ApiTags('resource-access')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('domains/:resourceId/members')
export class DomainMembersController {
  constructor(private readonly service: ResourceAccessService) {}

  @Get()
  @ApiOperation({ summary: 'Lista membros do domínio (OWNER/ADMIN)' })
  list(@CurrentUser() u: User, @Param('resourceId') id: string) {
    return this.service.list(u.id, 'domain', id);
  }

  @Patch(':accessId')
  @ApiOperation({ summary: 'Atualiza role de membro do domínio' })
  update(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateAccessRoleDto,
  ) {
    return this.service.update(u.id, 'domain', id, accessId, dto.role);
  }

  @Delete(':accessId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove membro do domínio' })
  remove(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
  ) {
    return this.service.remove(u.id, 'domain', id, accessId);
  }
}

@ApiTags('resource-access')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('mailboxes/:resourceId/members')
export class MailboxMembersController {
  constructor(private readonly service: ResourceAccessService) {}

  @Get()
  list(@CurrentUser() u: User, @Param('resourceId') id: string) {
    return this.service.list(u.id, 'mailbox', id);
  }

  @Patch(':accessId')
  update(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateAccessRoleDto,
  ) {
    return this.service.update(u.id, 'mailbox', id, accessId, dto.role);
  }

  @Delete(':accessId')
  @HttpCode(204)
  remove(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
  ) {
    return this.service.remove(u.id, 'mailbox', id, accessId);
  }
}

@ApiTags('resource-access')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('mail-groups/:resourceId/members')
export class MailGroupMembersController {
  constructor(private readonly service: ResourceAccessService) {}

  @Get()
  list(@CurrentUser() u: User, @Param('resourceId') id: string) {
    return this.service.list(u.id, 'mail-group', id);
  }

  @Patch(':accessId')
  update(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateAccessRoleDto,
  ) {
    return this.service.update(u.id, 'mail-group', id, accessId, dto.role);
  }

  @Delete(':accessId')
  @HttpCode(204)
  remove(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
  ) {
    return this.service.remove(u.id, 'mail-group', id, accessId);
  }
}

@ApiTags('resource-access')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('webhooks/endpoints/:resourceId/members')
export class WebhookMembersController {
  constructor(private readonly service: ResourceAccessService) {}

  @Get()
  list(@CurrentUser() u: User, @Param('resourceId') id: string) {
    return this.service.list(u.id, 'webhook', id);
  }

  @Patch(':accessId')
  update(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateAccessRoleDto,
  ) {
    return this.service.update(u.id, 'webhook', id, accessId, dto.role);
  }

  @Delete(':accessId')
  @HttpCode(204)
  remove(
    @CurrentUser() u: User,
    @Param('resourceId') id: string,
    @Param('accessId') accessId: string,
  ) {
    return this.service.remove(u.id, 'webhook', id, accessId);
  }
}
