import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, TenantTier, TenantStatus } from '@prisma/client';
import { SessionContext } from '../../lib/auth/session-context';
import { CreateTenantDto, UpdateTenantBrandingDto } from './dto/create-tenant.dto';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';
import {
  parsePagination,
  createPaginatedResponse,
  PaginatedResult,
} from '../super-admin/common/pagination.helper';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

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

  async getRootTenantId(): Promise<string | null> {
    const root = await this.prisma.tenant.findFirst({
      where: { tier: TenantTier.PLATFORM_ROOT },
      select: { id: true },
    });
    return root?.id || null;
  }

  async updateBranding(id: string, data: UpdateTenantBrandingDto, actor: SessionContext) {
    // Ancestry access check
    await this.findOne(id, actor);

    const cleanDomain = data.customDomain !== undefined
      ? (data.customDomain ? data.customDomain.toLowerCase().trim() : null)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.primaryColor ? { primaryColor: data.primaryColor } : {}),
          ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
          ...(data.faviconUrl !== undefined ? { faviconUrl: data.faviconUrl } : {}),
          ...(cleanDomain !== undefined ? { customDomain: cleanDomain } : {}),
        },
      });

      if (cleanDomain) {
        await tx.domainMapping.upsert({
          where: { domain: cleanDomain },
          create: {
            id: randomUUID(),
            tenantId: id,
            domain: cleanDomain,
            isVerified: true,
          },
          update: {
            tenantId: id,
            isVerified: true,
          },
        });
      }

      return updated;
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

  // ==========================================
  // HIERARCHICAL WHITE-LABEL CLIENT PROVISIONING
  // ==========================================

  async getClients(
    actor: SessionContext,
    params?: {
      search?: string;
      status?: string;
      plan?: string;
      page?: string | number;
      limit?: string | number;
    },
  ): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit);
    const where: any = {
      tier: TenantTier.END_CLIENT,
    };

    if (actor.role === Role.RESELLER_ADMIN) {
      where.parentId = actor.tenantId;
    } else if (actor.role !== Role.SUPER_ADMIN) {
      where.id = actor.tenantId;
    }

    if (params?.status && params.status !== 'ALL' && params.status !== 'All') {
      const upper = params.status.toUpperCase();
      if (upper === 'ACTIVE') where.status = TenantStatus.ACTIVE;
      else if (upper === 'SUSPENDED') where.status = TenantStatus.SUSPENDED;
      else if (upper === 'CANCELLED' || upper === 'INACTIVE') where.status = TenantStatus.CANCELLED;
    }

    if (params?.plan && params.plan !== 'ALL' && params.plan !== 'All') {
      where.subscriptions = {
        some: {
          planName: { contains: params.plan, mode: 'insensitive' },
        },
      };
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          {
            users: {
              some: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { phone: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    const [total, clients] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          users: { where: { role: Role.TENANT_ADMIN }, take: 1 },
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
          wallet: true,
          _count: { select: { users: true, workflows: true, campaigns: true, crmContacts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = clients.map((c) => {
      const adminUser = c.users[0] || null;
      const sub = c.subscriptions[0] || null;
      const planName = sub?.planName || 'Pro';
      const mrr = planName === 'Enterprise' ? 4500 : planName === 'Pro' ? 1200 : planName === 'Growth' ? 99 : 29;

      let mappedStatus: 'Active' | 'Suspended' | 'Trial' | 'Inactive' = 'Active';
      if (c.status === TenantStatus.ACTIVE) mappedStatus = 'Active';
      else if (c.status === TenantStatus.SUSPENDED) mappedStatus = 'Suspended';
      else mappedStatus = 'Inactive';

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        ownerName: adminUser?.name || 'Account Admin',
        email: adminUser?.email || '',
        phone: adminUser?.phone || '',
        plan: planName,
        status: mappedStatus,
        whatsappStatus: 'Connected',
        walletBalance: c.wallet?.balance || 0,
        signupDate: c.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        mrr,
        totalUsers: c._count.users || 1,
        lastActive: 'Active recently',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        partner: c.parent ? { id: c.parent.id, name: c.parent.name, slug: c.parent.slug } : null,
      };
    });

    return createPaginatedResponse(formatted, total, page, limit);
  }

  async getClientById(id: string, actor: SessionContext) {
    const client = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } },
        subscriptions: { orderBy: { createdAt: 'desc' } },
        wallet: true,
        channelConfigs: true,
        _count: { select: { users: true, workflows: true, campaigns: true, crmContacts: true } },
      },
    });

    if (!client) throw new NotFoundException('Client not found');

    if (actor.role !== Role.SUPER_ADMIN) {
      const isParent = client.parentId === actor.tenantId;
      const isSelf = client.id === actor.tenantId;
      if (!isParent && !isSelf) {
        throw new ForbiddenException('Access denied: Client outside your authorized organization');
      }
    }

    const adminUser = client.users.find((u) => u.role === Role.TENANT_ADMIN) || client.users[0] || null;
    const sub = client.subscriptions[0] || null;

    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      ownerName: adminUser?.name || 'Account Admin',
      email: adminUser?.email || '',
      phone: adminUser?.phone || '',
      plan: sub?.planName || 'Pro',
      status: client.status === TenantStatus.ACTIVE ? 'Active' : 'Suspended',
      whatsappStatus: 'Connected',
      walletBalance: client.wallet?.balance || 0,
      signupDate: client.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      mrr: 1999,
      totalUsers: client._count.users,
      lastActive: 'Active recently',
      createdAt: client.createdAt,
      partner: client.parent,
      adminUser,
      subscription: sub,
      wallet: client.wallet,
      channels: client.channelConfigs,
    };
  }

  async createClient(data: CreateClientDto, actor: SessionContext) {
    let partnerId: string;
    if (actor.role === Role.RESELLER_ADMIN) {
      if (!actor.tenantId) {
        throw new BadRequestException('Partner organization context not found for reseller admin');
      }
      partnerId = actor.tenantId;
    } else if (actor.role === Role.SUPER_ADMIN) {
      if (!data.partnerId) {
        throw new BadRequestException('partnerId is required when creating a client as Super Admin');
      }
      partnerId = data.partnerId;
    } else {
      throw new ForbiddenException('Only White-Label Partners and Super Admins can provision client accounts');
    }

    const partner = await this.prisma.tenant.findUnique({
      where: { id: partnerId },
      include: {
        partnerConfig: true,
      },
    });
    if (!partner) throw new NotFoundException('Partner organization not found');

    // Check client quota
    const clientLimit = partner.maxEndClients || partner.partnerConfig?.clientLimit || 50;
    const currentCount = await this.prisma.tenant.count({
      where: { parentId: partner.id, tier: TenantTier.END_CLIENT },
    });
    if (clientLimit > 0 && currentCount >= clientLimit) {
      throw new BadRequestException(
        `Partner organization has reached its maximum quota of ${clientLimit} clients. Contact platform administrator to upgrade.`,
      );
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw new ConflictException(`User email ${cleanEmail} is already registered.`);
    }

    const slug = data.slug ? this.generateSlug(data.slug) : this.generateSlug(data.name);
    const clientId = randomUUID();
    const cleanId = clientId.replace(/-/g, '_');
    const path = `${partner.path}.t_${cleanId}`;
    const depth = partner.depth + 1;

    const rawPassword =
      data.adminPassword && data.adminPassword.trim().length >= 6
        ? data.adminPassword.trim()
        : Math.random().toString(36).slice(-8) + 'Aa1!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    let tenantStatus: TenantStatus = TenantStatus.ACTIVE;
    if (data.status) {
      const s = data.status.toUpperCase();
      if (s === 'SUSPENDED') tenantStatus = TenantStatus.SUSPENDED;
      else if (s === 'CANCELLED' || s === 'INACTIVE') tenantStatus = TenantStatus.CANCELLED;
    }

    const planName = data.plan || 'Pro';
    let price = '₹1,999/mo';
    if (planName.toLowerCase().includes('starter')) price = '₹999/mo';
    else if (planName.toLowerCase().includes('growth')) price = '₹1,999/mo';
    else if (planName.toLowerCase().includes('pro')) price = '₹2,999/mo';
    else if (planName.toLowerCase().includes('enterprise')) price = '₹4,999/mo';

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Client Tenant
      const clientTenant = await tx.tenant.create({
        data: {
          id: clientId,
          name: data.name.trim(),
          slug,
          tier: TenantTier.END_CLIENT,
          path,
          depth,
          parentId: partner.id,
          status: tenantStatus,
          primaryColor: partner.primaryColor || '#0f172a',
        },
      });

      // 2. Create Owner User
      const ownerUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: data.ownerName?.trim() || `${data.name.trim()} Admin`,
          phone: data.phone?.trim() || null,
          role: Role.TENANT_ADMIN,
          tenantId: clientTenant.id,
        },
      });

      // 3. Create Subscription
      const subscription = await tx.subscription.create({
        data: {
          tenantId: clientTenant.id,
          planName,
          planId: planName.toLowerCase().replace(/\s+/g, '-'),
          price,
          status: 'ACTIVE',
        },
      });

      // 4. Create Wallet
      const wallet = await tx.wallet.create({
        data: {
          tenantId: clientTenant.id,
          balance: data.walletBalance !== undefined ? Number(data.walletBalance) : 0,
          currency: 'INR',
        },
      });

      const mrr = planName === 'Enterprise' ? 4500 : planName === 'Pro' ? 1200 : planName === 'Growth' ? 99 : 29;

      return {
        id: clientTenant.id,
        name: clientTenant.name,
        slug: clientTenant.slug,
        ownerName: ownerUser.name,
        email: ownerUser.email,
        phone: ownerUser.phone || '',
        plan: planName,
        status: tenantStatus === TenantStatus.ACTIVE ? 'Active' : 'Suspended',
        whatsappStatus: data.whatsappStatus || 'Connected',
        walletBalance: wallet.balance,
        signupDate: clientTenant.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        mrr,
        totalUsers: 1,
        lastActive: 'Just now',
        partner: { id: partner.id, name: partner.name, slug: partner.slug },
        adminUser: { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email, phone: ownerUser.phone },
        subscription: { planName: subscription.planName, price: subscription.price, status: subscription.status },
        wallet: { balance: wallet.balance, currency: wallet.currency },
        createdAt: clientTenant.createdAt,
      };
    });
  }

  async updateClient(id: string, data: UpdateClientDto, actor: SessionContext) {
    const client = await this.prisma.tenant.findUnique({
      where: { id },
      include: { users: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }, wallet: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    if (actor.role !== Role.SUPER_ADMIN && client.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.name || data.status) {
        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.status) {
          const s = data.status.toUpperCase();
          if (s === 'ACTIVE') updateData.status = TenantStatus.ACTIVE;
          else if (s === 'SUSPENDED') updateData.status = TenantStatus.SUSPENDED;
          else if (s === 'CANCELLED' || s === 'INACTIVE') updateData.status = TenantStatus.CANCELLED;
        }
        await tx.tenant.update({ where: { id }, data: updateData });
      }

      if (data.ownerName || data.email || data.phone !== undefined) {
        const adminUser = client.users.find((u) => u.role === Role.TENANT_ADMIN) || client.users[0];
        if (adminUser) {
          const userUpdate: any = {};
          if (data.ownerName) userUpdate.name = data.ownerName.trim();
          if (data.phone !== undefined) userUpdate.phone = data.phone?.trim() || null;
          if (data.email && data.email.toLowerCase().trim() !== adminUser.email.toLowerCase().trim()) {
            const cleanEmail = data.email.toLowerCase().trim();
            const exists = await tx.user.findFirst({ where: { email: cleanEmail, NOT: { id: adminUser.id } } });
            if (exists) throw new BadRequestException(`Email ${cleanEmail} is already in use`);
            userUpdate.email = cleanEmail;
          }
          await tx.user.update({ where: { id: adminUser.id }, data: userUpdate });
        }
      }

      if (data.plan) {
        const existingSub = client.subscriptions[0];
        if (existingSub) {
          await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              planName: data.plan,
              planId: data.plan.toLowerCase().replace(/\s+/g, '-'),
            },
          });
        }
      }

      if (data.walletBalance !== undefined) {
        await tx.wallet.upsert({
          where: { tenantId: id },
          create: {
            id: randomUUID(),
            tenantId: id,
            balance: Number(data.walletBalance) || 0,
            currency: 'INR',
          },
          update: {
            balance: Number(data.walletBalance) || 0,
          },
        });
      }

      return { success: true, message: 'Client updated successfully' };
    });
  }

  async updateClientStatus(id: string, status: string, actor: SessionContext) {
    const client = await this.prisma.tenant.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    if (actor.role !== Role.SUPER_ADMIN && client.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    const upper = status.toUpperCase();
    let tenantStatus: TenantStatus = TenantStatus.ACTIVE;
    if (upper === 'ACTIVE') tenantStatus = TenantStatus.ACTIVE;
    else if (upper === 'SUSPENDED') tenantStatus = TenantStatus.SUSPENDED;
    else if (upper === 'CANCELLED' || upper === 'INACTIVE') tenantStatus = TenantStatus.CANCELLED;

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: tenantStatus },
    });

    return { success: true, client: updated };
  }

  async deleteClient(id: string, actor: SessionContext) {
    const client = await this.prisma.tenant.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    if (actor.role !== Role.SUPER_ADMIN && client.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    try {
      await this.prisma.tenant.delete({ where: { id } });
      return { success: true, message: 'Client organization deleted successfully' };
    } catch {
      await this.prisma.tenant.update({
        where: { id },
        data: { status: TenantStatus.CANCELLED },
      });
      return { success: true, message: 'Client organization cancelled successfully' };
    }
  }

  // ==========================================
  // CLIENT GUEST LOGIN / IMPERSONATION
  // ==========================================
  async loginAsGuest(clientId: string, actor: SessionContext, ip?: string) {
    // 1. Fetch target client organization
    const client = await this.prisma.tenant.findUnique({
      where: { id: clientId },
      include: {
        parent: { select: { id: true, name: true, slug: true, tier: true, path: true } },
        users: { where: { role: Role.TENANT_ADMIN }, take: 1 },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        wallet: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Client organization not found');
    }

    // 2. Strict Role & Tenant Hierarchy Verification
    if (actor.role === Role.SUPER_ADMIN || (actor as any).role === 'SUPER_ADMIN' || (actor as any).role === 'owner') {
      // Super Admin: authorized globally for any client
    } else if (actor.role === Role.RESELLER_ADMIN || (actor as any).role === 'RESELLER_ADMIN') {
      // White-Label Admin: authorized ONLY if client belongs to their partner hierarchy
      const partnerId = actor.tenantId;
      const callerPath = actor.orgPath || 'root';

      const isDirectChild = client.parentId === partnerId;
      const isDescendant = callerPath && client.path && client.path.startsWith(callerPath + '.');

      if (!isDirectChild && !isDescendant) {
        throw new ForbiddenException(
          'Access denied: Client does not belong to your White-Label Partner organization',
        );
      }
    } else {
      throw new ForbiddenException(
        'Access denied: Only Super Admins and White-Label Partner Admins can log in as guest',
      );
    }

    // 3. Resolve target client primary administrative user
    let clientAdminUser = client.users[0];
    if (!clientAdminUser) {
      clientAdminUser = await this.prisma.user.findFirst({
        where: { tenantId: client.id },
      });
    }

    if (!clientAdminUser) {
      const tempEmail = `admin.${client.slug}@workspace.local`;
      const tempPasswordHash = await bcrypt.hash(randomUUID(), 12);
      clientAdminUser = await this.prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash: tempPasswordHash,
          name: `${client.name} Administrator`,
          role: Role.TENANT_ADMIN,
          tenantId: client.id,
        },
      });
    }

    // 4. Generate client workspace JWT tokens
    const clientOrgPath = client.path || 'root';
    const clientTier = client.tier || TenantTier.END_CLIENT;
    const tokens = await this.authService.generateTokens(
      clientAdminUser.id,
      clientAdminUser.email,
      client.id,
      clientAdminUser.role,
      clientOrgPath,
      clientTier,
    );

    // 5. Generate short-lived support impersonation token for audit context & headers
    const isSuper = actor.role === Role.SUPER_ADMIN || (actor as any).role === 'SUPER_ADMIN' || (actor as any).role === 'owner';
    const impersonationRole = isSuper ? Role.SUPER_ADMIN : Role.RESELLER_ADMIN;
    const impersonationPurpose = isSuper ? 'super_admin_impersonation' : 'reseller_impersonation';

    const impersonationToken = await this.jwt.signAsync(
      {
        sub: actor.userId,
        role: impersonationRole,
        targetWorkspaceId: client.id,
        targetOrgPath: client.path,
        targetTier: client.tier,
        purpose: impersonationPurpose,
      },
      {
        secret:
          this.config.get<string>('IMPERSONATION_JWT_SECRET') ||
          this.config.get<string>('JWT_ACCESS_SECRET') ||
          this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('IMPERSONATION_JWT_EXPIRY') || '15m',
      },
    );

    // 6. Record in append-only AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          id: randomUUID(),
          superAdminId: actor.userId,
          targetWorkspaceId: client.id,
          action: 'IMPERSONATION_STARTED',
          endpoint: `POST /tenants/clients/${client.id}/guest-login`,
          actorEmail: actor.email || undefined,
          ipAddress: ip || '127.0.0.1',
          details: {
            actorRole: actor.role,
            partnerId: actor.tenantId,
            targetClientId: client.id,
            targetClientName: client.name,
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record guest login audit trail: ${err.message}`);
    }

    // 7. Format user and client organization context
    const formattedUser = this.authService.formatUser(clientAdminUser, client.name);
    const activeSub = client.subscriptions[0] || null;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      impersonationToken,
      expiresIn: this.config.get<string>('IMPERSONATION_JWT_EXPIRY') || '15m',
      user: {
        ...formattedUser,
        role: 'owner', // Grant dashboard owner role view during guest session
        tenantId: client.id,
        workspaceId: client.id,
        workspaceName: client.name,
      },
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        ownerName: clientAdminUser.name || 'Account Admin',
        email: clientAdminUser.email,
        plan: activeSub?.planName || 'Pro',
        walletBalance: client.wallet?.balance || 0,
        whatsappStatus: 'Connected',
      },
    };
  }
}

