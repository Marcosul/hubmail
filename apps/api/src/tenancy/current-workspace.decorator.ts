import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { WorkspaceContext } from './workspace-context';

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceContext => {
    const req = ctx.switchToHttp().getRequest<{ workspace?: WorkspaceContext }>();
    if (!req.workspace) {
      throw new Error('CurrentWorkspace used without WorkspaceGuard in the pipeline');
    }
    return req.workspace;
  },
);
