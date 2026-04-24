import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CryptoService } from './crypto.service';
import { HtmlSanitizerService } from './html-sanitizer.service';
import { JmapClient } from './jmap.client';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MailboxesController } from './mailboxes.controller';
import { MailboxesService } from './mailboxes.service';
import { SmtpService } from './smtp.service';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [MailboxesController, MailController],
  providers: [
    CryptoService,
    HtmlSanitizerService,
    JmapClient,
    SmtpService,
    MailboxesService,
    MailService,
  ],
  exports: [MailService, MailboxesService, CryptoService, SmtpService],
})
export class MailModule {}
