import { Injectable, NestMiddleware, Logger, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantContextStore } from '../../lib/auth/tenant-context.store';
import { TenantStatus, TenantTier, DomainVerificationStatus, Role } from '@prisma/client';

export interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
  path: string;
  depth: number;
  status: TenantStatus;
  primaryColor?: string | null;
  logoUrl?: string | null;
  customDomain?: string | null;
  isPlatformAdmin?: boolean;
  partnerId?: string | null;
  isWhiteLabel?: boolean;
  isDirect?: boolean;
  domainContext?: 'MARKETING' | 'DIRECT_CLIENT' | 'DIRECT_ADMIN' | 'SUPER_ADMIN' | 'PARTNER_ADMIN' | 'CUSTOM_DOMAIN';
}

declare global {
  namespace Express {
    interface Request {
      tenant?: ResolvedTenant;
    }
  }
}

// In-memory LRU-style cache for sub-millisecond host -> tenant lookup
const tenantCache = new Map<string, { tenant: ResolvedTenant | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tenantContextStore: TenantContextStore,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract the normalized hostname from x-forwarded-host or host (strip trailing ports and www.)
      const rawHostHeader = (
        (req.headers['x-forwarded-host'] as string) ||
        req.headers.host ||
        ''
      ).split(',')[0].trim();

      let normalizedHost = rawHostHeader.split(':')[0].toLowerCase().trim();
      if (normalizedHost.startsWith('www.')) {
        normalizedHost = normalizedHost.substring(4);
      }

      // If incoming request is directly to the API domain or Render host, inspect Origin or Referer
      if (
        normalizedHost === 'api.appnix.co.in' ||
        normalizedHost.endsWith('.onrender.com') ||
        normalizedHost === 'localhost' ||
        normalizedHost === '127.0.0.1'
      ) {
        const originHeader = (req.headers['origin'] || req.headers['referer']) as string | undefined;
        if (originHeader) {
          try {
            const parsedUrl = new URL(originHeader);
            const originHost = parsedUrl.hostname.toLowerCase().trim();
            normalizedHost = originHost.startsWith('www.') ? originHost.substring(4) : originHost;
          } catch {
            // keep normalizedHost as-is
          }
        }
      }

      const explicitTenantId = (req.headers['x-tenant-id'] || req.headers['x-workspace-id'] || req.query.tenantId) as string | undefined;

      let resolvedTenant: ResolvedTenant | null = null;
      let domainContext: 'MARKETING' | 'DIRECT_CLIENT' | 'DIRECT_ADMIN' | 'SUPER_ADMIN' | 'PARTNER_ADMIN' | 'CUSTOM_DOMAIN' = 'MARKETING';

      // Resolution priority:
      if (
        normalizedHost === 'appnix.co.in' ||
        normalizedHost === 'api.appnix.co.in' ||
        normalizedHost.endsWith('.onrender.com') ||
        normalizedHost === 'localhost' ||
        normalizedHost === '127.0.0.1' ||
        !normalizedHost
      ) {
        // If hostname matches appnix.co.in or www.appnix.co.in -> Context: MARKETING
        domainContext = 'MARKETING';
        resolvedTenant = {
          id: 'marketing',
          name: 'Appnix Marketing',
          slug: 'marketing',
          tier: TenantTier.PLATFORM_ROOT,
          path: 'root',
          depth: 0,
          status: TenantStatus.ACTIVE,
          isPlatformAdmin: false,
          domainContext: 'MARKETING',
        };
        this.tenantContextStore.enter({
          tenantId: 'marketing',
          domainContext: 'MARKETING',
        });
      } else if (normalizedHost === 'app.appnix.co.in' || normalizedHost === 'app.localhost') {
        // If hostname matches app.appnix.co.in -> Context: DIRECT_CLIENT (isDirect: true, tenantId: 'APPNIX_DIRECT')
        domainContext = 'DIRECT_CLIENT';
        resolvedTenant = {
          id: 'APPNIX_DIRECT',
          name: 'Appnix Direct Client Portal',
          slug: 'app',
          tier: TenantTier.END_CLIENT,
          path: 'root',
          depth: 1,
          status: TenantStatus.ACTIVE,
          isPlatformAdmin: false,
          isDirect: true,
          domainContext: 'DIRECT_CLIENT',
        };
        this.tenantContextStore.enter({
          tenantId: 'APPNIX_DIRECT',
          isDirect: true,
          domainContext: 'DIRECT_CLIENT',
        });
      } else if (normalizedHost === 'admin.appnix.co.in' || normalizedHost === 'admin.localhost') {
        // If hostname matches admin.appnix.co.in -> Context: DIRECT_ADMIN (isDirect: true)
        domainContext = 'DIRECT_ADMIN';
        resolvedTenant = {
          id: 'root',
          name: 'Platform Staff Administration',
          slug: 'admin',
          tier: TenantTier.PLATFORM_ROOT,
          path: 'root',
          depth: 0,
          status: TenantStatus.ACTIVE,
          isPlatformAdmin: true,
          isDirect: true,
          domainContext: 'DIRECT_ADMIN',
        };
        this.tenantContextStore.enter({
          tenantId: 'root',
          isDirect: true,
          domainContext: 'DIRECT_ADMIN',
        });
      } else if (normalizedHost === 'superadmin.appnix.co.in' || normalizedHost === 'superadmin.localhost') {
        // If hostname matches superadmin.appnix.co.in -> Context: SUPER_ADMIN
        domainContext = 'SUPER_ADMIN';
        resolvedTenant = {
          id: 'root',
          name: 'Platform Super Administration',
          slug: 'superadmin',
          tier: TenantTier.PLATFORM_ROOT,
          path: 'root',
          depth: 0,
          status: TenantStatus.ACTIVE,
          isPlatformAdmin: true,
          domainContext: 'SUPER_ADMIN',
        };
        this.tenantContextStore.enter({
          tenantId: 'root',
          domainContext: 'SUPER_ADMIN',
        });
      } else if (normalizedHost === 'partners.appnix.co.in' || normalizedHost === 'partners.localhost') {
        // If hostname matches partners.appnix.co.in -> Context: PARTNER_ADMIN
        domainContext = 'PARTNER_ADMIN';
        resolvedTenant = {
          id: 'partners',
          name: 'White-Label Partners',
          slug: 'partners',
          tier: TenantTier.PRIMARY_RESELLER,
          path: 'root',
          depth: 1,
          status: TenantStatus.ACTIVE,
          isPlatformAdmin: false,
          domainContext: 'PARTNER_ADMIN',
        };
        this.tenantContextStore.enter({
          tenantId: 'partners',
          domainContext: 'PARTNER_ADMIN',
        });
      } else {
        // For any other hostname (Custom Domain e.g., xyz.com):
        domainContext = 'CUSTOM_DOMAIN';

        // Check if bypass path for internal endpoints (health, swagger, webhooks, resolve-domain)
        const isBypassPath =
          req.path === '/health' ||
          req.path === '/api/v1/health' ||
          req.originalUrl?.includes('/health') ||
          req.originalUrl?.includes('/tenants/resolve-domain') ||
          req.originalUrl?.includes('/webhooks') ||
          req.originalUrl?.includes('/api/docs');

        // Query DomainMapping where domain = hostname AND status = 'VERIFIED'
        const domainMapping = await this.prisma.domainMapping.findFirst({
          where: {
            domain: normalizedHost,
            OR: [
              { status: DomainVerificationStatus.VERIFIED },
              { status: 'VERIFIED' as any },
              { isVerified: true },
            ],
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                tier: true,
                path: true,
                depth: true,
                status: true,
                primaryColor: true,
                logoUrl: true,
                customDomain: true,
              },
            },
          },
        });

        if (domainMapping && domainMapping.tenant && domainMapping.tenant.status === TenantStatus.ACTIVE) {
          resolvedTenant = {
            id: domainMapping.tenant.id,
            name: domainMapping.tenant.name,
            slug: domainMapping.tenant.slug,
            tier: domainMapping.tenant.tier,
            path: domainMapping.tenant.path,
            depth: domainMapping.tenant.depth,
            status: domainMapping.tenant.status,
            primaryColor: domainMapping.tenant.primaryColor,
            logoUrl: domainMapping.tenant.logoUrl,
            customDomain: domainMapping.domain,
            isPlatformAdmin: false,
            partnerId: domainMapping.tenantId,
            isWhiteLabel: true,
            domainContext: 'CUSTOM_DOMAIN',
          };

          // If found: attach tenantId, partnerId = domainMapping.tenantId, and isWhiteLabel: true to AsyncLocalStorage context
          this.tenantContextStore.enter({
            tenantId: domainMapping.tenantId,
            partnerId: domainMapping.tenantId,
            isWhiteLabel: true,
            domainContext: 'CUSTOM_DOMAIN',
          });
        }
        // } else if (!isBypassPath) {
        //   // If not found or unverified: throw NotFoundException('Custom domain not verified or inactive.')
        //   throw new NotFoundException('Custom domain not verified or inactive.');
        // }
      }

      // If explicit tenant ID is provided and not in a conflicting custom domain, enrich context
      if (explicitTenantId && domainContext !== 'CUSTOM_DOMAIN') {
        const explicitTenant = await this.prisma.tenant.findUnique({
          where: { id: explicitTenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            tier: true,
            path: true,
            depth: true,
            status: true,
            primaryColor: true,
            logoUrl: true,
            customDomain: true,
          },
        });
        if (explicitTenant) {
          resolvedTenant = {
            ...explicitTenant,
            isPlatformAdmin: explicitTenant.tier === TenantTier.PLATFORM_ROOT,
            isDirect: domainContext === 'DIRECT_CLIENT' || domainContext === 'DIRECT_ADMIN',
            domainContext,
          };
          this.tenantContextStore.enter({
            tenantId: explicitTenant.id,
            isDirect: resolvedTenant.isDirect,
            domainContext,
          });
        }
      }

      if (resolvedTenant) {
        req.tenant = resolvedTenant;
        res.setHeader('X-Tenant-ID', resolvedTenant.id);
        res.setHeader('X-Tenant-Path', resolvedTenant.path);
        res.setHeader('X-Domain-Context', domainContext);
        if (resolvedTenant.isDirect) {
          res.setHeader('X-Is-Direct', 'true');
        }
        if (resolvedTenant.isWhiteLabel) {
          res.setHeader('X-Is-White-Label', 'true');
        }
      }

      // 2. Resolve User from Authorization Header or HttpOnly Cookie
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (req.cookies && req.cookies['appnix_access_token']) {
        token = req.cookies['appnix_access_token'];
      }

      if (token) {
        try {
          const secret =
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            this.configService.get<string>('JWT_SECRET') ||
            'default-access-secret';

          const payload = this.jwtService.verify(token, { secret });
          if (payload) {
            const userPrincipal = {
              userId: payload.sub,
              email: payload.email,
              tenantId: payload.tenantId,
              role: payload.role,
              orgPath: payload.orgPath || 'root',
              tier: payload.tier || 'END_CLIENT',
              permissions: payload.permissions || ['*'],
            };

            // Attach user to express request if not already populated
            if (!req.user) {
              req.user = userPrincipal;
            }

            const existingStore = this.tenantContextStore.get();
            let impersonatedWorkspaceId: string | undefined;
            let effectiveTenantId = existingStore?.tenantId || userPrincipal.tenantId;

            const impersonationToken =
              (req.headers['x-impersonation-token'] as string) ||
              (req.cookies && req.cookies['appnix_impersonation_token']);

            if (impersonationToken) {
              try {
                const impSecret =
                  this.configService.get<string>('IMPERSONATION_JWT_SECRET') ||
                  this.configService.get<string>('JWT_ACCESS_SECRET') ||
                  this.configService.get<string>('JWT_SECRET') ||
                  secret;

                const impClaims: any = this.jwtService.verify(impersonationToken, { secret: impSecret });
                if (impClaims && impClaims.targetWorkspaceId) {
                  const isActorAuthorized =
                    userPrincipal.role === Role.SUPER_ADMIN ||
                    userPrincipal.role === Role.APP_ADMIN ||
                    (userPrincipal.role === Role.RESELLER_ADMIN &&
                      (!impClaims.targetOrgPath || impClaims.targetOrgPath.startsWith(userPrincipal.orgPath + '.')));

                  if (isActorAuthorized) {
                    impersonatedWorkspaceId = impClaims.targetWorkspaceId;
                    effectiveTenantId = impClaims.targetWorkspaceId;
                    (req.user as any).impersonatedWorkspaceId = impersonatedWorkspaceId;
                    res.setHeader('X-Impersonated-Tenant-ID', impersonatedWorkspaceId);
                  }
                }
              } catch {
                // Token invalid or expired; leave untouched for guards
              }
            }

            // Sync with async local storage, merging domain context
            this.tenantContextStore.enter({
              userId: userPrincipal.userId,
              email: userPrincipal.email,
              role: userPrincipal.role,
              workspaceId: userPrincipal.tenantId,
              tenantId: effectiveTenantId,
              impersonatedWorkspaceId,
              partnerId: existingStore?.partnerId,
              isWhiteLabel: existingStore?.isWhiteLabel,
              isDirect: existingStore?.isDirect,
              domainContext: existingStore?.domainContext || domainContext,
              orgPath: userPrincipal.orgPath,
              tier: userPrincipal.tier,
              permissions: userPrincipal.permissions,
            });
          }
        } catch {
          // Token invalid or expired; leave req.user empty for guards to handle
        }
      }

      next();
    } catch (err: any) {
      if (err instanceof NotFoundException || err?.status === 404) {
        return next(err);
      }
      this.logger.error(`TenantContextMiddleware error: ${err.message}`, err.stack);
      next(err);
    }
  }
}
