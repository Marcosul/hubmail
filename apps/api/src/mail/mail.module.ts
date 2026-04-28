import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { WebhookDispatcherModule } from '../webhooks/webhook-dispatcher.module';
import { CryptoService } from './crypto.service';
import { HtmlSanitizerService } from './html-sanitizer.service';
import { JmapClient } from './jmap.client';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MailStreamService } from './mail-stream.service';
import { MailboxesController } from './mailboxes.controller';
import { MailboxesService } from './mailboxes.service';
import { SmtpService } from './smtp.service';

@Module({
  imports: [AuthModule, TenancyModule, WebhookDispatcherModule],
  controllers: [MailboxesController, MailController],
  providers: [
    CryptoService,
    HtmlSanitizerService,
    JmapClient,
    SmtpService,
    MailboxesService,
    MailService,
    MailStreamService,
  ],
  exports: [MailService, MailboxesService, CryptoService, SmtpService, JmapClient, MailStreamService],
})
export class MailModule {}
