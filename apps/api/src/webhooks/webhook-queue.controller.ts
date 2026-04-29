import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { WebhookQueueService } from './webhook-queue.service';

@ApiTags('webhooks')
@UseGuards(SupabaseJwtAuthGuard)
@Controller('webhooks/queue')
export class WebhookQueueController {
  constructor(private readonly queueService: WebhookQueueService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get webhook queue statistics',
    description: 'Returns stats about pending, active, failed, and completed jobs',
  })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('clear-failed')
  @ApiOperation({
    summary: 'Clear failed webhook queue jobs',
    description: 'Removes failed jobs from the queue (use with caution)',
  })
  async clearFailed() {
    await this.queueService.clearFailedJobs();
    return { ok: true, message: 'Failed jobs cleared' };
  }
}
