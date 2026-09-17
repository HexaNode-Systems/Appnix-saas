import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface AuthUser {
  userId: string;
  id?: string;
  email: string;
  tenantId: string;
  role: Role;
  workspaceId?: string;
  impersonatedWorkspaceId?: string;
  orgPath?: string;
  tier?: string;
  permissions?: string[];
  isImpersonated?: boolean;
  impersonatorId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
