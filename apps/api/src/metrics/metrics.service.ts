import { Injectable, Logger } from '@nestjs/common';
import { InboxEventType, OutgoingMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly log = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceSnapshot(workspaceId: string, hours = 24) {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const [sent, failed, received, bounced, spam] = await Promise.all([
      this.prisma.outgoingMessage.count({
        where: { workspaceId, status: OutgoingMessageStatus.SENT, createdAt: { gte: since } },
      }),
      this.prisma.outgoingMessage.count({
        where: { workspaceId, status: OutgoingMessageStatus.FAILED, createdAt: { gte: since } },
      }),
      this.prisma.inboxEvent.count({
        where: {
          workspaceId,
          type: InboxEventType.RECEIVED,
          receivedAt: { gte: since },
        },
      }),
      this.prisma.inboxEvent.count({
        where: {
          workspaceId,
          type: InboxEventType.BOUNCED,
          receivedAt: { gte: since },
        },
      }),
      this.prisma.inboxEvent.count({
        where: {
          workspaceId,
          type: InboxEventType.SPAM,
          receivedAt: { gte: since },
        },
      }),
    ]);

    const totalAttempts = sent + failed;
    const deliveryPct = totalAttempts === 0 ? 0 : Math.round((sent / totalAttempts) * 100);
    return {
      windowHours: hours,
      sent,
      delivered: sent,
      deliveryPct,
      received,
      bounced,
      complained: spam,
      rejected: failed,
      score: deliveryPct,
      generatedAt: new Date().toISOString(),
    };
  }
}
