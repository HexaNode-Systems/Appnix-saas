import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const jwtTenantId = request.user?.tenantId;
    const headerTenantId = request.headers['x-tenant-id'];

    if (!jwtTenantId) {
      throw new BadRequestException('Authenticated tenant context is required');
    }

    const impersonatedWorkspaceId = request.user?.impersonatedWorkspaceId;
    const isPlatformAdmin =
      request.user?.role === 'SUPER_ADMIN' || request.user?.role === 'APP_ADMIN';

    if (headerTenantId) {
      const matchesSession = String(headerTenantId) === String(jwtTenantId);
      const matchesImpersonation =
        impersonatedWorkspaceId && String(headerTenantId) === String(impersonatedWorkspaceId);

      if (!matchesSession && !matchesImpersonation && !isPlatformAdmin) {
        throw new ForbiddenException('Tenant mismatch');
      }

      if (matchesImpersonation || isPlatformAdmin) {
        request.tenantId = String(headerTenantId);
        return true;
      }
    }

    // A header may only corroborate the effective signed context; it can never
    // select a tenant. This preserves backwards compatibility for old clients.
    request.tenantId = impersonatedWorkspaceId || jwtTenantId;
    return true;
  }
}
