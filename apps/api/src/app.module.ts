import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AutomationsModule } from './automations/automations.module';
import { DomainsModule } from './domains/domains.module';
import { MailModule } from './mail/mail.module';
import { MetricsModule } from './metrics/metrics.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WorkspaceMembersModule } from './workspace-members/workspace-members.module';
import { WorkspaceInvitesModule } from './workspace-invites/workspace-invites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    TenancyModule,
    WorkspacesModule,
    WorkspaceMembersModule,
    WorkspaceInvitesModule,
    MailModule,
    QueueModule,
    DomainsModule,
    ApiKeysModule,
    WebhooksModule,
    AutomationsModule,
    MetricsModule,
    AgentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
