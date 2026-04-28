import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceMembersController],
  providers: [WorkspaceMembersService],
  exports: [WorkspaceMembersService],
})
export class WorkspaceMembersModule {}
