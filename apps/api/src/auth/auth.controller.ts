import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService, AuthSessionPayload } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login com email e palavra-passe (Supabase)' })
  login(@Body() dto: LoginDto): Promise<AuthSessionPayload> {
    return this.auth.login(dto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login com Google (ID token do cliente)' })
  google(@Body() dto: GoogleAuthDto): Promise<AuthSessionPayload> {
    return this.auth.google(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar sessão com refresh token' })
  refresh(@Body() dto: RefreshDto): Promise<AuthSessionPayload> {
    return this.auth.refresh(dto);
  }

  @Get('me')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do utilizador autenticado (Bearer access token)' })
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      appMetadata: user.app_metadata,
      userMetadata: user.user_metadata,
    };
  }
}
