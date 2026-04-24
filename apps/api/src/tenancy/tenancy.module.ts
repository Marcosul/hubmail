import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceGuard } from './workspace.guard';

@Module({
  imports: [AuthModule],
  providers: [WorkspaceGuard],
  exports: [WorkspaceGuard],
})
export class TenancyModule {}
