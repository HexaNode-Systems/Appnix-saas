import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class ResellerPortalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      userId?: string;
      role?: Role | string;
      impersonatedWorkspaceId?: string;
    } | undefined;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required for reseller portal');
    }

    // Rejects APP_ADMIN
    if (user.role === Role.APP_ADMIN || user.role === 'APP_ADMIN') {
      throw new ForbiddenException(
        'Access denied: Direct platform staff cannot access the reseller portal',
      );
    }

    // Rejects direct clients (CLIENT_USER, MEMBER, TENANT_ADMIN)
    if (
      user.role === Role.CLIENT_USER ||
      user.role === 'CLIENT_USER' ||
      user.role === Role.MEMBER ||
      user.role === 'MEMBER' ||
      user.role === Role.TENANT_ADMIN ||
      user.role === 'TENANT_ADMIN'
    ) {
      throw new ForbiddenException(
        'Access denied: Direct clients cannot access the reseller portal',
      );
    }

    // Super Admin oversight (impersonation or platform ownership)
    if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Validates user has role RESELLER_ADMIN
    if (user.role !== Role.RESELLER_ADMIN && user.role !== 'RESELLER_ADMIN') {
      throw new ForbiddenException(
        'Access denied: Reseller administrator clearance required',
      );
    }

    return true;
  }
}
