import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationMailService } from '../mail/notification-mail.service';
import { InviteAcceptController, WorkspaceInvitesController } from './workspace-invites.controller';
import { WorkspaceInvitesService } from './workspace-invites.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceInvitesController, InviteAcceptController],
  providers: [WorkspaceInvitesService, NotificationMailService],
  exports: [WorkspaceInvitesService],
})
export class WorkspaceInvitesModule {}
