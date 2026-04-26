import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainsModule } from '../domains/domains.module';
import { MailIngestWorker } from './mail-ingest.worker';
import { MailSendRetryWorker } from './mail-send.worker';
import { StalwartDomainProvisionWorker } from './stalwart-domain-provision.worker';
import { WebhookDispatchWorker } from './webhook-dispatch.worker';
import { QueueService } from './queue.service';
import { REDIS_CONNECTION, createRedisConnection } from './redis.provider';
import { MailModule } from '../mail/mail.module';
import { AutomationsModule } from '../automations/automations.module';

@Global()
@Module({
  imports: [MailModule, AutomationsModule, DomainsModule],
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createRedisConnection(config.get<string>('REDIS_URL')?.trim() || undefined),
    },
    QueueService,
    MailIngestWorker,
    MailSendRetryWorker,
    WebhookDispatchWorker,
    StalwartDomainProvisionWorker,
  ],
  exports: [QueueService],
})
export class QueueModule {}
