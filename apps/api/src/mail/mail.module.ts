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
import { MailGroupsController } from './mail-groups.controller';
import { MailGroupsService } from './mail-groups.service';
import { SmtpService } from './smtp.service';

@Module({
  imports: [AuthModule, TenancyModule, WebhookDispatcherModule],
  controllers: [MailboxesController, MailGroupsController, MailController],
  providers: [
    CryptoService,
    HtmlSanitizerService,
    JmapClient,
    SmtpService,
    MailboxesService,
    MailGroupsService,
    MailService,
    MailStreamService,
  ],
  exports: [
    MailService,
    MailboxesService,
    MailGroupsService,
    CryptoService,
    SmtpService,
    JmapClient,
    MailStreamService,
  ],
})
export class MailModule {}
