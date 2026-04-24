import { Module } from '@nestjs/common';
import { MailWebhooksController } from './mail-webhooks.controller';
import { WebhookSignatureService } from './webhook-signature.service';

@Module({
  controllers: [MailWebhooksController],
  providers: [WebhookSignatureService],
  exports: [WebhookSignatureService],
})
export class WebhooksModule {}
