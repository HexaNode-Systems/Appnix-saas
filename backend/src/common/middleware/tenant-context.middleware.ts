import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantContextStore } from '../../lib/auth/tenant-context.store';
import { TenantStatus, TenantTier } from '@prisma/client';

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
      // 1. Resolve Tenant from Host, Subdomain, or Header
      const rawHost = (req.headers.host || '').split(':')[0].toLowerCase().trim();
      const explicitTenantId = (req.headers['x-tenant-id'] || req.headers['x-workspace-id'] || req.query.tenantId) as string | undefined;

      let resolvedTenant: ResolvedTenant | null = null;

      // Check cache first for host
      const cacheKey = explicitTenantId ? `id:${explicitTenantId}` : `host:${rawHost}`;
      const cached = tenantCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        resolvedTenant = cached.tenant;
      } else {
        if (explicitTenantId) {
          const tenant = await this.prisma.tenant.findUnique({
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
          if (tenant) {
            resolvedTenant = { ...tenant, isPlatformAdmin: tenant.tier === TenantTier.PLATFORM_ROOT };
          }
        } else if (rawHost.startsWith('admin.') || rawHost === 'admin.localhost') {
          // Platform root host
          resolvedTenant = {
            id: 'root',
            name: 'Platform Administration',
            slug: 'admin',
            tier: TenantTier.PLATFORM_ROOT,
            path: 'root',
            depth: 0,
            status: TenantStatus.ACTIVE,
            isPlatformAdmin: true,
          };
        } else if (rawHost) {
          // Check custom domain or domain mapping
          const mappedTenant = await this.prisma.tenant.findFirst({
            where: {
              OR: [
                { customDomain: rawHost },
                { domainMappings: { some: { domain: rawHost } } },
              ],
              status: TenantStatus.ACTIVE,
            },
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

          if (mappedTenant) {
            resolvedTenant = { ...mappedTenant, isPlatformAdmin: false };
          } else {
            // Check subdomain prefix (e.g. acme.platform.com)
            const parts = rawHost.split('.');
            if (parts.length >= 2) {
              const candidateSlug = parts[0];
              const slugTenant = await this.prisma.tenant.findUnique({
                where: { slug: candidateSlug },
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
              if (slugTenant) {
                resolvedTenant = { ...slugTenant, isPlatformAdmin: false };
              }
            }
          }
        }

        // Cache resolution result
        tenantCache.set(cacheKey, {
          tenant: resolvedTenant,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      if (resolvedTenant) {
        req.tenant = resolvedTenant;
        res.setHeader('X-Tenant-ID', resolvedTenant.id);
        res.setHeader('X-Tenant-Path', resolvedTenant.path);
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

            // Sync with async local storage
            this.tenantContextStore.enter({
              userId: userPrincipal.userId,
              email: userPrincipal.email,
              role: userPrincipal.role,
              workspaceId: userPrincipal.tenantId,
              tenantId: userPrincipal.tenantId,
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
      this.logger.error(`TenantContextMiddleware error: ${err.message}`, err.stack);
      next();
    }
  }
}
