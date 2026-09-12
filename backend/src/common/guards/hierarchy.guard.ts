import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class HierarchyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      userId?: string;
      tenantId?: string;
      role?: Role;
      orgPath?: string;
    } | undefined;

    if (!user || !user.userId || !user.tenantId) {
      throw new UnauthorizedException('Authenticated session required for hierarchy validation');
    }

    // Platform Super Admin and Direct App Admin have platform-level oversight
    if (user.role === Role.SUPER_ADMIN || user.role === Role.APP_ADMIN) {
      return true;
    }

    // Determine target tenant ID from params, body, or query
    const targetTenantId =
      request.params?.tenantId ||
      request.params?.workspaceId ||
      (request.route?.path?.includes('/tenants/:id') ? request.params?.id : undefined) ||
      request.body?.tenantId ||
      request.body?.workspaceId ||
      request.query?.tenantId ||
      request.query?.workspaceId ||
      user.tenantId;

    // Self-access or active impersonation access is allowed
    if (targetTenantId === user.tenantId || (user as any).impersonatedWorkspaceId === targetTenantId) {
      return true;
    }

    // Reseller Admin: allowed ONLY if target tenant is a downstream descendant
    if (user.role === Role.RESELLER_ADMIN) {
      const targetTenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
        select: { id: true, path: true, parentId: true },
      });

      if (!targetTenant) {
        throw new ForbiddenException('Target organization does not exist');
      }

      // Strictly disallow reseller access to platform root or direct platform tenants
      if (targetTenant.id === 'root' || targetTenant.path === 'root') {
        throw new ForbiddenException(
          'Cross-hierarchy violation: Reseller administrators cannot access platform root',
        );
      }

      let callerPath = user.orgPath;
      if (!callerPath || callerPath === 'root') {
        const callerTenant = await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { path: true },
        });
        callerPath = callerTenant?.path;
      }

      if (!callerPath || callerPath === 'root') {
        throw new ForbiddenException('Invalid reseller hierarchy context');
      }

      const isDirectChild = targetTenant.parentId === user.tenantId;
      const isDescendant =
        isDirectChild || (targetTenant.path && targetTenant.path.startsWith(callerPath + '.'));

      if (!isDescendant) {
        throw new ForbiddenException(
          'Cross-hierarchy violation: target organization is outside your authorized reseller tree',
        );
      }

      return true;
    }

    // Standard Tenant Admin / Member / Client User cannot access other tenants
    if (targetTenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied: cross-tenant operation not permitted');
    }

    return true;
  }
}
