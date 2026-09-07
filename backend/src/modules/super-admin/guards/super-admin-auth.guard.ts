import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required for Super Admin endpoints');
    }

    if (user.role !== Role.SUPER_ADMIN && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Access Denied: Tier-0 Super Admin clearance required. Normal Admin and Client accounts are forbidden.',
      );
    }

    return true;
  }
}
