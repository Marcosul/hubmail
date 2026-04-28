import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { MailWebhooksController } from './mail-webhooks.controller';
import { WebhookSignatureService } from './webhook-signature.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDispatcherModule } from './webhook-dispatcher.module';

@Module({
  imports: [AuthModule, TenancyModule, PrismaModule, MailModule, WebhookDispatcherModule],
  controllers: [MailWebhooksController, WebhooksController],
  providers: [WebhookSignatureService, WebhooksService],
  exports: [WebhookSignatureService, WebhookDispatcherModule],
})
export class WebhooksModule {}
