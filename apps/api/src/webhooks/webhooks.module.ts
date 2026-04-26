import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { MailWebhooksController } from './mail-webhooks.controller';
import { WebhookSignatureService } from './webhook-signature.service';

@Module({
  imports: [MailModule],
  controllers: [MailWebhooksController],
  providers: [WebhookSignatureService],
  exports: [WebhookSignatureService],
})
export class WebhooksModule {}
