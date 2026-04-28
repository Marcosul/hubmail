import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { WebhookEventType } from '@prisma/client';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { WebhooksService } from './webhooks.service';
import {
  CreateWebhookDto,
  ListEventsQueryDto,
  UpdateWebhookDto,
} from './dto/webhook.dto';
import { ALL_WEBHOOK_EVENTS, WEBHOOK_EVENT_PUBLIC_NAME } from './webhook-events.constants';

@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('event-catalog')
  catalog() {
    return ALL_WEBHOOK_EVENTS.map((e) => ({
      type: e,
      name: WEBHOOK_EVENT_PUBLIC_NAME[e],
    }));
  }

  @Get('endpoints')
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.webhooks.list(ws.workspaceId);
  }

  @Post('endpoints')
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooks.create(ws.workspaceId, user.id, dto);
  }

  @Patch('endpoints/:id')
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooks.update(ws.workspaceId, id, user.id, dto);
  }

  @Delete('endpoints/:id')
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.webhooks.remove(ws.workspaceId, id, user.id);
  }

  @Post('endpoints/:id/rotate-secret')
  rotate(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.webhooks.rotateSecret(ws.workspaceId, id, user.id);
  }

  @Get('events')
  events(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Query() query: ListEventsQueryDto,
  ) {
    return this.webhooks.listEvents(ws.workspaceId, {
      eventType: query.eventType as WebhookEventType | undefined,
      limit: query.limit,
    });
  }

  @Get('events/:id')
  event(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.webhooks.getEvent(ws.workspaceId, id);
  }

  @Get('activity')
  activity(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Query('hours') hoursRaw?: string,
  ) {
    const hours = hoursRaw ? Math.min(Math.max(parseInt(hoursRaw, 10) || 6, 1), 168) : 6;
    return this.webhooks.activity(ws.workspaceId, hours);
  }
}
