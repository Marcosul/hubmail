import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtAuthGuard],
  exports: [AuthService, SupabaseJwtAuthGuard],
})
export class AuthModule {}
