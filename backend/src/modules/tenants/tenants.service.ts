import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, TenantTier, TenantStatus } from '@prisma/client';
import { SessionContext } from '../../lib/auth/session-context';
import { CreateTenantDto, UpdateTenantBrandingDto } from './dto/create-tenant.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface HierarchyNode {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
  path: string;
  depth: number;
  parentId: string | null;
  status: TenantStatus;
  userCount: number;
  workflowCount: number;
  children: HierarchyNode[];
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    const suffix = Math.random().toString(36).substring(2, 7);
    return `${base || 'org'}-${suffix}`;
  }

  async findAll(actor?: SessionContext) {
    if (!actor || actor.role === Role.SUPER_ADMIN) {
      return this.prisma.tenant.findMany({
        include: {
          _count: {
            select: { users: true, workflows: true, campaigns: true, crmContacts: true },
          },
          parent: {
            select: { id: true, name: true, slug: true, tier: true },
          },
        },
        orderBy: [{ depth: 'asc' }, { createdAt: 'desc' }],
      });
    }

    if (actor.role === Role.RESELLER_ADMIN) {
      const actorPath = actor.orgPath || 'root';
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `
        SELECT t.id, t.name, t.slug, t.tier, t.path, t.depth, t."parentId", t.status,
               t."customDomain", t."primaryColor", t."logoUrl", t."faviconUrl",
               t."maxSubResellers", t."maxEndClients", t."maxUsers", t."createdAt", t."updatedAt",
               (SELECT COUNT(*)::int FROM users u WHERE u."tenantId" = t.id) as "userCount",
               (SELECT COUNT(*)::int FROM workflows w WHERE w."tenantId" = t.id) as "workflowCount",
               (SELECT COUNT(*)::int FROM campaigns c WHERE c."tenantId" = t.id) as "campaignCount",
               (SELECT COUNT(*)::int FROM crm_contacts cc WHERE cc."tenantId" = t.id) as "contactCount"
        FROM tenants t
        WHERE t.path::ltree <@ $1::ltree
        ORDER BY t.depth ASC, t."createdAt" DESC
      `,
        actorPath,
      );

      return rows.map((r) => ({
        ...r,
        _count: {
          users: r.userCount,
          workflows: r.workflowCount,
          campaigns: r.campaignCount,
          crmContacts: r.contactCount,
        },
      }));
    }

    // Standard Tenant Admin or Member: scoped only to their own workspace
    return this.prisma.tenant.findMany({
      where: { id: actor.tenantId },
      include: {
        _count: {
          select: { users: true, workflows: true },
        },
      },
    });
  }

  async findOne(id: string, actor?: SessionContext) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true, tier: true } },
        children: { select: { id: true, name: true, slug: true, tier: true, depth: true, status: true } },
        domainMappings: true,
        _count: {
          select: { users: true, workflows: true, campaigns: true, crmContacts: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Hierarchy isolation check: non-super-admins cannot read tenants outside their subtree
    if (actor && actor.role !== Role.SUPER_ADMIN) {
      const isSelf = actor.tenantId === tenant.id;
      const actorPath = actor.orgPath || 'root';
      const isDescendant = tenant.path.startsWith(actorPath + '.') || tenant.path === actorPath;

      if (!isSelf && !isDescendant) {
        throw new ForbiddenException('Access denied: organization outside your authorized hierarchy');
      }
    }

    return tenant;
  }

  async getHierarchy(actor: SessionContext): Promise<HierarchyNode[]> {
    let rows: any[] = [];

    if (actor.role === Role.SUPER_ADMIN) {
      rows = await this.prisma.$queryRawUnsafe(`
        SELECT t.id, t.name, t.slug, t.tier, t.path, t.depth, t."parentId", t.status,
               (SELECT COUNT(*)::int FROM users u WHERE u."tenantId" = t.id) as "userCount",
               (SELECT COUNT(*)::int FROM workflows w WHERE w."tenantId" = t.id) as "workflowCount"
        FROM tenants t
        ORDER BY t.depth ASC, t.name ASC
      `);
    } else {
      const actorPath = actor.orgPath || 'root';
      rows = await this.prisma.$queryRawUnsafe(
        `
        SELECT t.id, t.name, t.slug, t.tier, t.path, t.depth, t."parentId", t.status,
               (SELECT COUNT(*)::int FROM users u WHERE u."tenantId" = t.id) as "userCount",
               (SELECT COUNT(*)::int FROM workflows w WHERE w."tenantId" = t.id) as "workflowCount"
        FROM tenants t
        WHERE t.path::ltree <@ $1::ltree
        ORDER BY t.depth ASC, t.name ASC
      `,
        actorPath,
      );
    }

    // Build hierarchical tree
    const map = new Map<string, HierarchyNode>();
    const rootNodes: HierarchyNode[] = [];

    for (const r of rows) {
      const node: HierarchyNode = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        path: r.path,
        depth: r.depth,
        parentId: r.parentId,
        status: r.status,
        userCount: r.userCount || 0,
        workflowCount: r.workflowCount || 0,
        children: [],
      };
      map.set(r.id, node);
    }

    for (const r of rows) {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId) && r.id !== actor.tenantId) {
        map.get(r.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  async create(data: CreateTenantDto, actor?: SessionContext) {
    const slug = data.slug ? this.generateSlug(data.slug) : this.generateSlug(data.name);

    // Check slug collision
    const existingSlug = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new BadRequestException(`Slug '${slug}' is already taken.`);
    }

    let parentId = data.parentId || null;
    let targetTier = data.tier || TenantTier.END_CLIENT;

    // Reseller Admin can only provision children under their own organization
    if (actor && actor.role === Role.RESELLER_ADMIN) {
      if (!parentId) {
        parentId = actor.tenantId;
      } else {
        // Verify parent is within actor's subtree
        const targetParent = await this.prisma.tenant.findUnique({ where: { id: parentId } });
        if (!targetParent || (!targetParent.path.startsWith(actor.orgPath + '.') && targetParent.id !== actor.tenantId)) {
          throw new ForbiddenException('Cannot provision tenant outside your authorized hierarchy');
        }
      }
      // Reseller Admins can create SUB_RESELLER or END_CLIENT, but never PLATFORM_ROOT
      if (targetTier === TenantTier.PLATFORM_ROOT) {
        targetTier = TenantTier.SUB_RESELLER;
      }
    }

    // Check parent quotas if parentId is set
    let parentPath = 'root';
    let parentDepth = 0;

    if (parentId) {
      const parent = await this.prisma.tenant.findUnique({
        where: { id: parentId },
        include: {
          _count: {
            select: { children: true },
          },
        },
      });

      if (!parent) throw new NotFoundException('Parent organization not found');

      // Check tier-specific quota
      if (targetTier === TenantTier.SUB_RESELLER) {
        const subResellersCount = await this.prisma.tenant.count({
          where: { parentId, tier: TenantTier.SUB_RESELLER },
        });
        if (parent.maxSubResellers > 0 && subResellersCount >= parent.maxSubResellers) {
          throw new BadRequestException(
            `Parent organization has reached its maximum quota of ${parent.maxSubResellers} sub-resellers.`,
          );
        }
      } else {
        const endClientsCount = await this.prisma.tenant.count({
          where: { parentId, tier: TenantTier.END_CLIENT },
        });
        if (parent.maxEndClients > 0 && endClientsCount >= parent.maxEndClients) {
          throw new BadRequestException(
            `Parent organization has reached its maximum quota of ${parent.maxEndClients} end clients.`,
          );
        }
      }

      parentPath = parent.path;
      parentDepth = parent.depth;
    }

    const tenantId = randomUUID();
    const cleanId = tenantId.replace(/-/g, '_');
    const path = parentId ? `${parentPath}.t_${cleanId}` : `root.t_${cleanId}`;
    const depth = parentId ? parentDepth + 1 : 1;

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          id: tenantId,
          name: data.name,
          slug,
          tier: targetTier,
          path,
          depth,
          parentId,
          customDomain: data.customDomain || null,
          primaryColor: data.primaryColor || '#0f172a',
          logoUrl: data.logoUrl || null,
          faviconUrl: data.faviconUrl || null,
          maxSubResellers: data.maxSubResellers ?? 0,
          maxEndClients: data.maxEndClients ?? 10,
        },
      });

      // If initial admin credentials were provided, provision initial admin user
      if (data.adminEmail && data.adminPassword) {
        const existingUser = await tx.user.findUnique({ where: { email: data.adminEmail } });
        if (existingUser) {
          throw new BadRequestException(`User email ${data.adminEmail} is already registered.`);
        }

        const passwordHash = await bcrypt.hash(data.adminPassword, 12);
        const userRole = targetTier === TenantTier.SUB_RESELLER || targetTier === TenantTier.PRIMARY_RESELLER
          ? Role.RESELLER_ADMIN
          : Role.TENANT_ADMIN;

        await tx.user.create({
          data: {
            email: data.adminEmail,
            passwordHash,
            name: `${data.name} Admin`,
            role: userRole,
            tenantId: tenant.id,
          },
        });
      }

      // If customDomain was specified, create corresponding domain_mapping record
      if (data.customDomain) {
        await tx.domainMapping.create({
          data: {
            tenantId: tenant.id,
            domain: data.customDomain.toLowerCase().trim(),
            isVerified: true,
          },
        });
      }

      return tenant;
    });
  }

  async updateBranding(id: string, data: UpdateTenantBrandingDto, actor: SessionContext) {
    // Ancestry access check
    await this.findOne(id, actor);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.primaryColor ? { primaryColor: data.primaryColor } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.faviconUrl !== undefined ? { faviconUrl: data.faviconUrl } : {}),
        ...(data.customDomain !== undefined ? { customDomain: data.customDomain } : {}),
      },
    });
  }

  async resolveDomain(rawHost: string) {
    if (!rawHost) {
      return { found: false, reason: 'Missing host header' };
    }

    // Strip port if present (e.g. "portal.client.com:3000" -> "portal.client.com")
    const cleanHost = rawHost.split(':')[0].toLowerCase().trim();

    // 1. Check Platform Root Admin subdomain
    if (cleanHost.startsWith('admin.') || cleanHost === 'admin.localhost') {
      return {
        found: true,
        type: 'PLATFORM_ROOT',
        tier: TenantTier.PLATFORM_ROOT,
        isPlatformAdmin: true,
        tenant: null,
      };
    }

    // 2. Check Custom Domain in Tenant or DomainMapping
    const mappedTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { customDomain: cleanHost },
          { domainMappings: { some: { domain: cleanHost } } },
        ],
        status: TenantStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tier: true,
        path: true,
        primaryColor: true,
        logoUrl: true,
        faviconUrl: true,
        status: true,
      },
    });

    if (mappedTenant) {
      return {
        found: true,
        type: 'CUSTOM_DOMAIN',
        tier: mappedTenant.tier,
        isPlatformAdmin: false,
        tenant: mappedTenant,
      };
    }

    // 3. Check Subdomain Pattern (e.g., "{slug}.platform.com" or "{slug}.localhost")
    const parts = cleanHost.split('.');
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
          primaryColor: true,
          logoUrl: true,
          faviconUrl: true,
          status: true,
        },
      });

      if (slugTenant) {
        return {
          found: true,
          type: 'SUBDOMAIN',
          tier: slugTenant.tier,
          isPlatformAdmin: false,
          tenant: slugTenant,
        };
      }
    }

    return {
      found: false,
      reason: `No active organization found for host ${cleanHost}`,
    };
  }
}
