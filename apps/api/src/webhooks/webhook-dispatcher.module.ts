import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Module({
  imports: [PrismaModule],
  providers: [WebhookDispatcherService],
  exports: [WebhookDispatcherService],
})
export class WebhookDispatcherModule {}
