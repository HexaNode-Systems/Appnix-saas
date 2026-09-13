import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, TenantTier } from '@prisma/client';

@Injectable()
export class TenantWorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract and normalize hostname
    const rawHostHeader = (
      (request.headers['x-forwarded-host'] as string) ||
      request.headers.host ||
      ''
    ).split(',')[0].trim();

    let host = rawHostHeader.split(':')[0].toLowerCase().trim();
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }

    const user = request.user as {
      userId?: string;
      tenantId?: string;
      role?: Role | string;
      orgPath?: string;
    } | undefined;

    // Determine target tenant ID from request context
    const targetTenantId =
      request.params?.tenantId ||
      request.params?.workspaceId ||
      (request.route?.path?.includes('/tenants/:id') ? request.params?.id : undefined) ||
      request.body?.tenantId ||
      request.body?.workspaceId ||
      request.query?.tenantId ||
      request.query?.workspaceId ||
      request.headers['x-tenant-id'] ||
      user?.tenantId;

    // =========================================================================
    // CASE A: Request host is app.appnix.co.in (Direct Appnix Client Portal)
    // =========================================================================
    const isDirectAppHost =
      host === 'app.appnix.co.in' ||
      host === 'app.localhost' ||
      host === 'app.local';

    if (isDirectAppHost) {
      // Direct portal: verify target tenant belongs to direct Appnix
      if (targetTenantId && targetTenantId !== 'APPNIX_DIRECT') {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: targetTenantId },
          select: { id: true, path: true, parentId: true, tier: true },
        });

        if (tenant) {
          // If parent is a reseller or path has multiple segments under a reseller, reject
          const isDirect =
            tenant.tier === TenantTier.PLATFORM_ROOT ||
            !tenant.parentId ||
            tenant.parentId === 'root' ||
            (tenant.path && tenant.path.startsWith('root.') && tenant.path.split('.').length === 2);

          if (!isDirect) {
            // Check if parent is a reseller
            if (tenant.parentId) {
              const parent = await this.prisma.tenant.findUnique({
                where: { id: tenant.parentId },
                select: { tier: true },
              });
              if (
                parent?.tier === TenantTier.PRIMARY_RESELLER ||
                parent?.tier === TenantTier.SUB_RESELLER
              ) {
                throw new ForbiddenException(
                  'Cross-domain violation: Reseller clients must access via their custom partner domain',
                );
              }
            }
          }
        }
      }

      // Check authenticated user: reseller admins must use partners.appnix.co.in
      if (user && user.role === Role.RESELLER_ADMIN) {
        throw new ForbiddenException(
          'Cross-domain violation: Reseller administrators must use the partner administration console',
        );
      }

      return true;
    }

    // =========================================================================
    // CASE B: Request host is a Custom Domain (e.g. xyz.com)
    // =========================================================================
    const isKnownAppnixHost =
      host === 'appnix.co.in' ||
      host === 'api.appnix.co.in' ||
      host === 'admin.appnix.co.in' ||
      host === 'superadmin.appnix.co.in' ||
      host === 'partners.appnix.co.in' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.onrender.com') ||
      !host;

    if (!isKnownAppnixHost) {
      // Bypass path for health checks or public docs
      if (
        request.path === '/health' ||
        request.path === '/api/v1/health' ||
        request.originalUrl?.includes('/health')
      ) {
        return true;
      }

      // Query DomainMapping where domain = hostname AND status = 'VERIFIED'
      const domainMapping = await this.prisma.domainMapping.findFirst({
        where: {
          domain: host,
          OR: [{ status: 'VERIFIED' as any }, { isVerified: true }],
        },
        include: {
          tenant: {
            select: { id: true, path: true, tier: true, status: true },
          },
        },
      });

      // if (!domainMapping || !domainMapping.tenant) {
      //   throw new NotFoundException('Custom domain not verified or inactive.');
      // }

      const partnerTenant = domainMapping.tenant;

      // Authenticated session required for workspace access
      if (!user || !user.userId) {
        throw new UnauthorizedException(
          'Authenticated session required for custom domain workspace',
        );
      }

      // Super Admin platform inspection is permitted
      if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
        return true;
      }

      // Verify the authenticated user belongs to the tenant or downstream children of the partner
      const isPartnerTenant = user.tenantId === partnerTenant.id;
      let isChildOfPartner = false;

      if (!isPartnerTenant) {
        let userPath = user.orgPath;
        if (!userPath || userPath === 'root') {
          const userTenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { id: true, path: true, parentId: true },
          });
          if (userTenant) {
            userPath = userTenant.path;
            isChildOfPartner =
              userTenant.parentId === partnerTenant.id ||
              (Boolean(partnerTenant.path) &&
                userTenant.path.startsWith(partnerTenant.path + '.'));
          }
        } else {
          isChildOfPartner =
            Boolean(partnerTenant.path) && userPath.startsWith(partnerTenant.path + '.');
        }
      }

      if (!isPartnerTenant && !isChildOfPartner) {
        throw new ForbiddenException(
          'Cross-tenant violation: User does not belong to the partner organization or authorized client accounts for this custom domain',
        );
      }

      // If target tenant is explicitly provided, verify it also belongs to this partner tree
      if (targetTenantId && targetTenantId !== partnerTenant.id) {
        const target = await this.prisma.tenant.findUnique({
          where: { id: targetTenantId },
          select: { id: true, path: true, parentId: true },
        });
        if (
          target &&
          target.parentId !== partnerTenant.id &&
          (!partnerTenant.path || !target.path.startsWith(partnerTenant.path + '.'))
        ) {
          throw new ForbiddenException(
            'Cross-domain violation: Target workspace does not belong to this custom domain',
          );
        }
      }

      return true;
    }

    return true;
  }
}
