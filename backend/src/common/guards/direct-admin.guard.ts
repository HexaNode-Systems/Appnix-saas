import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class DirectAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      userId?: string;
      role?: Role | string;
    } | undefined;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required for direct staff administration');
    }

    // Rejects RESELLER_ADMIN with 403 Forbidden: Resellers cannot access internal admin
    if (user.role === Role.RESELLER_ADMIN || user.role === 'RESELLER_ADMIN') {
      throw new ForbiddenException('Resellers cannot access internal admin');
    }

    // Validates user has role SUPER_ADMIN or APP_ADMIN
    const isDirectStaff =
      user.role === Role.SUPER_ADMIN ||
      user.role === 'SUPER_ADMIN' ||
      user.role === Role.APP_ADMIN ||
      user.role === 'APP_ADMIN';

    if (!isDirectStaff) {
      throw new ForbiddenException('Direct Appnix staff authorization required');
    }

    return true;
  }
}
