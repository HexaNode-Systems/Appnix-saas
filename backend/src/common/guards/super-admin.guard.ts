import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService?: JwtService,
    private readonly configService?: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      userId?: string;
      role?: Role | string;
    } | undefined;

    // 1. If user principal is already verified and attached to request
    if (user && user.userId) {
      if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
        return true;
      }
      throw new ForbiddenException(
        'Access Denied: Tier-0 Super Administrator clearance required',
      );
    }

    // 2. Otherwise verify from cookie or bearer token if JwtService is available
    let token: string | undefined;
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies) {
      token =
        request.cookies['appnix_superadmin_token'] ||
        request.cookies['appnix_access_token'];
    }

    if (!token) {
      throw new UnauthorizedException('Verified Super Admin session required');
    }

    if (!this.jwtService || !this.configService) {
      throw new UnauthorizedException('Authentication provider unavailable');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'default-access-secret';

      const payload = this.jwtService.verify(token, { secret });
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid or expired Super Admin token');
      }

      if (payload.role !== Role.SUPER_ADMIN && payload.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'Access Denied: Tier-0 Super Administrator clearance required',
        );
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
        orgPath: payload.orgPath || 'root',
        tier: payload.tier || 'PLATFORM_ROOT',
        permissions: payload.permissions || ['*'],
      };

      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Verified Super Admin session required');
    }
  }
}
