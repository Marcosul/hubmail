import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  DomainMembersController,
  MailboxMembersController,
  MailGroupMembersController,
  WebhookMembersController,
} from './resource-access.controller';
import { ResourceAccessService } from './resource-access.service';

@Module({
  imports: [AuthModule],
  controllers: [
    DomainMembersController,
    MailboxMembersController,
    MailGroupMembersController,
    WebhookMembersController,
  ],
  providers: [ResourceAccessService],
  exports: [ResourceAccessService],
})
export class ResourceAccessModule {}
