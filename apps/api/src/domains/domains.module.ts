import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { WebhookDispatcherModule } from '../webhooks/webhook-dispatcher.module';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { StalwartAdapter } from './stalwart.helper';
import { DnsHelper } from './dns.helper';

@Module({
  imports: [AuthModule, TenancyModule, MailModule, WebhookDispatcherModule],
  controllers: [DomainsController],
  providers: [StalwartAdapter, DnsHelper, DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
