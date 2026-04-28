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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { WorkspaceMembersService } from './workspace-members.service';

@ApiTags('workspace-members')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(private readonly service: WorkspaceMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista membros do workspace' })
  list(@CurrentUser() user: User, @Param('workspaceId') workspaceId: string) {
    return this.service.list(user.id, workspaceId);
  }

  @Patch(':membershipId')
  @ApiOperation({ summary: 'Altera role de um membro (OWNER/ADMIN only)' })
  updateRole(
    @CurrentUser() user: User,
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.service.updateRole(user.id, workspaceId, membershipId, dto);
  }

  @Delete(':membershipId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove membro do workspace (OWNER/ADMIN only)' })
  remove(
    @CurrentUser() user: User,
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.service.remove(user.id, workspaceId, membershipId);
  }
}
