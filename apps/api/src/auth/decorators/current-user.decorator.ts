import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<{ user?: User }>();
    if (!req.user) {
      throw new Error('CurrentUser decorator used without SupabaseJwtAuthGuard');
    }
    return req.user;
  },
);
