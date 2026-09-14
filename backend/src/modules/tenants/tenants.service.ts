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

import { PostgresService } from '../../database/postgres.service';

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
    private readonly postgres: PostgresService,
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

  private async resolveActorPath(actor: SessionContext): Promise<string> {
    if (actor.role === Role.SUPER_ADMIN) return 'root';
    let path = actor.orgPath;
    if (!path || path === 'root') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: actor.tenantId },
        select: { path: true },
      });
      path = tenant?.path;
    }
    if (!path || path === 'root') {
      throw new ForbiddenException('Invalid hierarchy context for tenant operation');
    }
    return path;
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
      const actorPath = await this.resolveActorPath(actor);
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
      const actorPath = await this.resolveActorPath(actor);
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
      const actorPath = await this.resolveActorPath(actor);
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
      const actorPath = await this.resolveActorPath(actor);
      if (!parentId) {
        parentId = actor.tenantId;
      } else {
        // Verify parent is within actor's subtree
        const targetParent = await this.prisma.tenant.findUnique({ where: { id: parentId } });
        if (!targetParent || (!targetParent.path.startsWith(actorPath + '.') && targetParent.id !== actor.tenantId)) {
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

    // 1. Check Specific Appnix Subdomains and Platforms
    if (cleanHost === 'superadmin.appnix.co.in' || cleanHost.startsWith('superadmin.localhost')) {
      return {
        found: true,
        type: 'SUPER_ADMIN',
        panel: 'SUPER_ADMIN',
        tier: TenantTier.PLATFORM_ROOT,
        isPlatformAdmin: true,
        isSuperAdmin: true,
        tenant: null,
      };
    }

    if (cleanHost === 'admin.appnix.co.in' || cleanHost.startsWith('admin.localhost')) {
      return {
        found: true,
        type: 'STAFF_ADMIN',
        panel: 'DIRECT_ADMIN',
        tier: TenantTier.PLATFORM_ROOT,
        isPlatformAdmin: true,
        isStaffAdmin: true,
        tenant: null,
      };
    }

    if (cleanHost === 'partners.appnix.co.in' || cleanHost.startsWith('partners.localhost')) {
      return {
        found: true,
        type: 'RESELLER_PORTAL',
        panel: 'RESELLER_ADMIN',
        isResellerPortal: true,
        tenant: null,
      };
    }

    if (cleanHost === 'app.appnix.co.in' || cleanHost.startsWith('app.localhost')) {
      return {
        found: true,
        type: 'DIRECT_APP',
        panel: 'CLIENT_PORTAL',
        isDirectAppnix: true,
        tenant: null,
      };
    }

    if (
      cleanHost === 'www.appnix.co.in' ||
      cleanHost === 'appnix.co.in' ||
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1'
    ) {
      return {
        found: true,
        type: 'PUBLIC_MARKETING',
        panel: 'MARKETING',
        isMarketing: true,
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

    const conditions: string[] = [`t.tier = 'END_CLIENT'::"TenantTier"`];
    const queryParams: any[] = [];

    if (actor.role === Role.RESELLER_ADMIN) {
      queryParams.push(actor.tenantId);
      conditions.push(`t."parentId" = $${queryParams.length}`);
    } else if (actor.role !== Role.SUPER_ADMIN) {
      queryParams.push(actor.tenantId);
      conditions.push(`t.id = $${queryParams.length}`);
    }

    if (params?.status && params.status !== 'ALL' && params.status !== 'All') {
      const upper = params.status.toUpperCase();
      let dbStatus = 'ACTIVE';
      if (upper === 'SUSPENDED') dbStatus = 'SUSPENDED';
      else if (upper === 'CANCELLED' || upper === 'INACTIVE') dbStatus = 'CANCELLED';
      queryParams.push(dbStatus);
      conditions.push(`t.status = $${queryParams.length}::"TenantStatus"`);
    }

    if (params?.plan && params.plan !== 'ALL' && params.plan !== 'All') {
      queryParams.push(`%${params.plan}%`);
      conditions.push(
        `EXISTS (SELECT 1 FROM subscriptions s WHERE s."tenantId" = t.id AND s."planName" ILIKE $${queryParams.length})`,
      );
    }

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      queryParams.push(q);
      const pIndex = queryParams.length;
      conditions.push(`(
        t.name ILIKE $${pIndex} OR
        t.slug ILIKE $${pIndex} OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u."tenantId" = t.id AND (
            u.name ILIKE $${pIndex} OR
            u.email ILIKE $${pIndex} OR
            u.phone ILIKE $${pIndex}
          )
        )
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // 1. Count query
    const countSql = `SELECT COUNT(*)::int as total FROM tenants t WHERE ${whereClause}`;
    const countRes = await this.postgres.query(countSql, queryParams);
    const total = countRes.rows[0]?.total || 0;

    // 2. Data query
    queryParams.push(take);
    const limitIdx = queryParams.length;
    queryParams.push(skip);
    const offsetIdx = queryParams.length;

    const dataSql = `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.status,
        t."createdAt",
        t."updatedAt",
        p.id as parent_id,
        p.name as parent_name,
        p.slug as parent_slug,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        s."planName" as plan_name,
        w.balance as wallet_balance,
        (SELECT COUNT(*)::int FROM users usr WHERE usr."tenantId" = t.id) as user_count
      FROM tenants t
      LEFT JOIN tenants p ON p.id = t."parentId"
      LEFT JOIN LATERAL (
        SELECT id, name, email, phone
        FROM users
        WHERE "tenantId" = t.id AND role = 'TENANT_ADMIN'::"Role"
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT "planName"
        FROM subscriptions
        WHERE "tenantId" = t.id
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN wallets w ON w."tenantId" = t.id
      WHERE ${whereClause}
      ORDER BY t."createdAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const rowsRes = await this.postgres.query(dataSql, queryParams);

    const formatted = rowsRes.rows.map((r) => {
      const planName = r.plan_name || 'Pro';
      const mrr = planName === 'Enterprise' ? 4500 : planName === 'Pro' ? 1200 : planName === 'Growth' ? 99 : 29;

      let mappedStatus: 'Active' | 'Suspended' | 'Trial' | 'Inactive' = 'Active';
      if (r.status === 'ACTIVE') mappedStatus = 'Active';
      else if (r.status === 'SUSPENDED') mappedStatus = 'Suspended';
      else mappedStatus = 'Inactive';

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        ownerName: r.user_name || 'Account Admin',
        email: r.user_email || '',
        phone: r.user_phone || '',
        plan: planName,
        status: mappedStatus,
        whatsappStatus: 'Connected',
        walletBalance: Number(r.wallet_balance) || 0,
        signupDate: new Date(r.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        mrr,
        totalUsers: r.user_count || 1,
        lastActive: 'Active recently',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        partner: r.parent_id ? { id: r.parent_id, name: r.parent_name, slug: r.parent_slug } : null,
      };
    });

    return createPaginatedResponse(formatted, total, page, limit);
  }

  async getClientById(id: string, actor: SessionContext) {
    const clientRes = await this.postgres.query(
      `SELECT
        t.id, t.name, t.slug, t.status, t."createdAt", t."updatedAt", t."parentId",
        p.id as parent_id, p.name as parent_name, p.slug as parent_slug,
        w.balance as wallet_balance, w.currency as wallet_currency
       FROM tenants t
       LEFT JOIN tenants p ON p.id = t."parentId"
       LEFT JOIN wallets w ON w."tenantId" = t.id
       WHERE t.id = $1`,
      [id],
    );

    if (clientRes.rows.length === 0) {
      throw new NotFoundException('Client not found');
    }
    const client = clientRes.rows[0];

    // Tenant isolation check
    if (actor.role !== Role.SUPER_ADMIN) {
      const isParent = client.parentId === actor.tenantId;
      const isSelf = client.id === actor.tenantId;
      if (!isParent && !isSelf) {
        throw new ForbiddenException('Access denied: Client outside your authorized organization');
      }
    }

    const usersRes = await this.postgres.query(
      `SELECT id, name, email, phone, role, "createdAt"
       FROM users
       WHERE "tenantId" = $1
       ORDER BY "createdAt" ASC`,
      [id],
    );
    const adminUser = usersRes.rows.find((u) => u.role === 'TENANT_ADMIN') || usersRes.rows[0] || null;

    const subsRes = await this.postgres.query(
      `SELECT id, "planName", price, status, "currentPeriodStart", "currentPeriodEnd"
       FROM subscriptions
       WHERE "tenantId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [id],
    );
    const sub = subsRes.rows[0] || null;

    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      ownerName: adminUser?.name || 'Account Admin',
      email: adminUser?.email || '',
      phone: adminUser?.phone || '',
      plan: sub?.planName || 'Pro',
      status: client.status === 'ACTIVE' ? 'Active' : 'Suspended',
      whatsappStatus: 'Connected',
      walletBalance: Number(client.wallet_balance) || 0,
      signupDate: new Date(client.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      mrr: 1999,
      totalUsers: usersRes.rows.length,
      lastActive: 'Active recently',
      createdAt: client.createdAt,
      partner: client.parent_id ? { id: client.parent_id, name: client.parent_name, slug: client.parent_slug } : null,
      adminUser: adminUser ? { id: adminUser.id, name: adminUser.name, email: adminUser.email, phone: adminUser.phone } : null,
      subscription: sub,
      wallet: { balance: Number(client.wallet_balance) || 0, currency: client.wallet_currency || 'INR' },
    };
  }

  async createClient(data: CreateClientDto, actor: SessionContext) {
    // 1. Derive partnerId strictly from authenticated session
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

    // 2. Validate password (minimum 8 characters required)
    const rawPassword = (data.password || data.adminPassword || '').trim();
    if (!rawPassword || rawPassword.length < 8) {
      throw new BadRequestException('Password is required and must be at least 8 characters long');
    }

    // 3. Find partner details using direct PostgreSQL
    const partnerRes = await this.postgres.query(
      `SELECT t.id, t.name, t.slug, t.path, t.depth, t."primaryColor", t."maxEndClients", pc."clientLimit"
       FROM tenants t
       LEFT JOIN partner_configs pc ON pc."tenantId" = t.id
       WHERE t.id = $1`,
      [partnerId],
    );
    if (partnerRes.rows.length === 0) {
      throw new NotFoundException('Partner organization not found');
    }
    const partner = partnerRes.rows[0];

    // 4. Check client quota
    const clientLimit = partner.maxEndClients || partner.clientLimit || 50;
    if (clientLimit > 0) {
      const countRes = await this.postgres.query(
        `SELECT COUNT(*)::int as count FROM tenants WHERE "parentId" = $1 AND tier = 'END_CLIENT'::"TenantTier"`,
        [partner.id],
      );
      const currentCount = countRes.rows[0]?.count || 0;
      if (currentCount >= clientLimit) {
        throw new BadRequestException(
          `Partner organization has reached its maximum quota of ${clientLimit} clients. Contact platform administrator to upgrade.`,
        );
      }
    }

    // 5. Check duplicate email in PostgreSQL users table
    const cleanEmail = data.email.toLowerCase().trim();
    const existingUserRes = await this.postgres.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail],
    );
    if (existingUserRes.rows.length > 0) {
      throw new ConflictException(`User email ${cleanEmail} is already registered.`);
    }

    // 6. Generate IDs and hierarchy fields
    const slug = data.slug ? this.generateSlug(data.slug) : this.generateSlug(data.name);
    const clientId = randomUUID();
    const cleanId = clientId.replace(/-/g, '_');
    const path = `${partner.path}.t_${cleanId}`;
    const depth = (partner.depth || 0) + 1;

    // 7. Hash password using project's standard bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    let tenantStatus = 'ACTIVE';
    if (data.status) {
      const s = data.status.toUpperCase();
      if (s === 'SUSPENDED') tenantStatus = 'SUSPENDED';
      else if (s === 'CANCELLED' || s === 'INACTIVE') tenantStatus = 'CANCELLED';
    }

    const planName = data.plan || 'Pro';
    let price = '₹1,999/mo';
    if (planName.toLowerCase().includes('starter')) price = '₹999/mo';
    else if (planName.toLowerCase().includes('growth')) price = '₹1,999/mo';
    else if (planName.toLowerCase().includes('pro')) price = '₹2,999/mo';
    else if (planName.toLowerCase().includes('enterprise')) price = '₹4,999/mo';

    const planSlug = planName.toLowerCase().replace(/\s+/g, '-');
    const planMatchRes = await this.postgres.query(
      `SELECT id FROM plans WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [planSlug, planName],
    );
    const matchedPlanId = planMatchRes.rows[0]?.id || null;

    // 8. Execute transactional direct PostgreSQL insert
    const pgClient = await this.postgres.getPool().connect();
    try {
      await pgClient.query('BEGIN');

      const now = new Date();

      // Insert tenant
      await pgClient.query(
        `INSERT INTO tenants (
          id, name, slug, status, tier, path, depth, "parentId", "primaryColor",
          "maxSubResellers", "maxEndClients", "maxUsers", "trialUsed", "twoFactorEnabled",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4::"TenantStatus", 'END_CLIENT'::"TenantTier", $5, $6, $7, $8,
          0, 10, 5, false, false,
          $9, $9
        )`,
        [
          clientId,
          data.name.trim(),
          slug,
          tenantStatus,
          path,
          depth,
          partner.id,
          partner.primaryColor || '#0f172a',
          now,
        ],
      );

      // Insert owner user with hashed password
      const userId = randomUUID();
      const ownerName = data.ownerName?.trim() || `${data.name.trim()} Admin`;
      const phone = data.phone?.trim() || null;
      await pgClient.query(
        `INSERT INTO users (
          id, email, "passwordHash", name, phone, role, "tenantId",
          language, theme, "twoFactorEnabled", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 'TENANT_ADMIN'::"Role", $6,
          'en', 'system', false, $7, $7
        )`,
        [
          userId,
          cleanEmail,
          passwordHash,
          ownerName,
          phone,
          clientId,
          now,
        ],
      );

      // Insert subscription
      const subId = randomUUID();
      const totalDays = 90;
      const currentPeriodEnd = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);
      await pgClient.query(
        `INSERT INTO subscriptions (
          id, "tenantId", "planId", "planName", "planRefId", price, status,
          "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
          "maxBots", "maxMessages", "maxTeamSeats", "usedBots", "usedMessages", "usedTeamSeats",
          "isTrial", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'ACTIVE'::"SubscriptionStatus",
          $7, $7, $8, $9,
          5, 10000, 5, 0, 0, 1,
          false, $8, $8
        )`,
        [
          subId,
          clientId,
          planSlug,
          planName,
          matchedPlanId,
          price,
          totalDays,
          now,
          currentPeriodEnd,
        ],
      );

      // Insert wallet
      const walletId = randomUUID();
      const initialBalance = data.walletBalance !== undefined ? Number(data.walletBalance) : 0;
      await pgClient.query(
        `INSERT INTO wallets (
          id, "tenantId", balance, currency, "minThreshold", "autoRechargeEnabled",
          "autoRechargeAmount", "defaultPaymentMethod", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'INR', 100.0, false, 500.0, 'WALLET', $4, $4
        )`,
        [
          walletId,
          clientId,
          initialBalance,
          now,
        ],
      );

      await pgClient.query('COMMIT');

      const mrr = planName === 'Enterprise' ? 4500 : planName === 'Pro' ? 1200 : planName === 'Growth' ? 99 : 29;

      return {
        id: clientId,
        name: data.name.trim(),
        slug,
        ownerName,
        email: cleanEmail,
        phone: phone || '',
        plan: planName,
        status: tenantStatus === 'ACTIVE' ? 'Active' : 'Suspended',
        whatsappStatus: data.whatsappStatus || 'Connected',
        walletBalance: initialBalance,
        signupDate: now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        mrr,
        totalUsers: 1,
        lastActive: 'Just now',
        partner: { id: partner.id, name: partner.name, slug: partner.slug },
        adminUser: { id: userId, name: ownerName, email: cleanEmail, phone: phone || '' },
        subscription: { planName, price, status: 'ACTIVE' },
        wallet: { balance: initialBalance, currency: 'INR' },
        createdAt: now,
      };
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    } finally {
      pgClient.release();
    }
  }

  async updateClient(id: string, data: UpdateClientDto, actor: SessionContext) {
    // 1. Check client existence and tenant isolation
    const clientRes = await this.postgres.query(
      `SELECT id, name, slug, status, tier, "parentId" FROM tenants WHERE id = $1`,
      [id],
    );
    if (clientRes.rows.length === 0) {
      throw new NotFoundException('Client not found');
    }
    const clientTenant = clientRes.rows[0];

    if (actor.role !== Role.SUPER_ADMIN && clientTenant.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    const pgClient = await this.postgres.getPool().connect();
    try {
      await pgClient.query('BEGIN');

      // Update tenant name / status
      if (data.name || data.status) {
        let tenantStatus = null;
        if (data.status) {
          const s = data.status.toUpperCase();
          if (s === 'ACTIVE') tenantStatus = 'ACTIVE';
          else if (s === 'SUSPENDED') tenantStatus = 'SUSPENDED';
          else if (s === 'CANCELLED' || s === 'INACTIVE') tenantStatus = 'CANCELLED';
        }

        await pgClient.query(
          `UPDATE tenants
           SET name = COALESCE($1, name),
               status = COALESCE($2::"TenantStatus", status),
               "updatedAt" = NOW()
           WHERE id = $3`,
          [data.name ? data.name.trim() : null, tenantStatus, id],
        );
      }

      // Update admin user (name, email, phone)
      if (data.ownerName || data.email || data.phone !== undefined) {
        const userRes = await pgClient.query(
          `SELECT id, email, name, phone FROM users WHERE "tenantId" = $1 AND role = 'TENANT_ADMIN'::"Role" LIMIT 1`,
          [id],
        );
        const adminUser = userRes.rows[0];
        if (adminUser) {
          let newEmail = adminUser.email;
          if (data.email && data.email.toLowerCase().trim() !== adminUser.email.toLowerCase().trim()) {
            const cleanEmail = data.email.toLowerCase().trim();
            const dupRes = await pgClient.query(
              `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
              [cleanEmail, adminUser.id],
            );
            if (dupRes.rows.length > 0) {
              throw new BadRequestException(`Email ${cleanEmail} is already in use`);
            }
            newEmail = cleanEmail;
          }

          await pgClient.query(
            `UPDATE users
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 phone = COALESCE($3, phone),
                 "updatedAt" = NOW()
             WHERE id = $4`,
            [
              data.ownerName ? data.ownerName.trim() : null,
              newEmail,
              data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : null,
              adminUser.id,
            ],
          );
        }
      }

      // Update subscription plan
      if (data.plan) {
        const subRes = await pgClient.query(
          `SELECT id FROM subscriptions WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
          [id],
        );
        if (subRes.rows.length > 0) {
          const subId = subRes.rows[0].id;
          const planSlug = data.plan.toLowerCase().replace(/\s+/g, '-');
          await pgClient.query(
            `UPDATE subscriptions
             SET "planName" = $1,
                 "planId" = $2,
                 "updatedAt" = NOW()
             WHERE id = $3`,
            [data.plan, planSlug, subId],
          );
        }
      }

      // Update wallet balance
      if (data.walletBalance !== undefined) {
        const balanceNum = Number(data.walletBalance) || 0;
        await pgClient.query(
          `INSERT INTO wallets (
            id, "tenantId", balance, currency, "minThreshold", "autoRechargeEnabled",
            "autoRechargeAmount", "defaultPaymentMethod", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, 'INR', 100.0, false, 500.0, 'WALLET', NOW(), NOW()
          )
          ON CONFLICT ("tenantId") DO UPDATE
          SET balance = EXCLUDED.balance, "updatedAt" = NOW()`,
          [randomUUID(), id, balanceNum],
        );
      }

      await pgClient.query('COMMIT');
      return { success: true, message: 'Client updated successfully' };
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    } finally {
      pgClient.release();
    }
  }

  async updateClientStatus(id: string, status: string, actor: SessionContext) {
    const clientRes = await this.postgres.query(
      `SELECT id, "parentId" FROM tenants WHERE id = $1`,
      [id],
    );
    if (clientRes.rows.length === 0) {
      throw new NotFoundException('Client not found');
    }
    const client = clientRes.rows[0];

    if (actor.role !== Role.SUPER_ADMIN && client.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    const upper = status.toUpperCase();
    let tenantStatus = 'ACTIVE';
    if (upper === 'ACTIVE') tenantStatus = 'ACTIVE';
    else if (upper === 'SUSPENDED') tenantStatus = 'SUSPENDED';
    else if (upper === 'CANCELLED' || upper === 'INACTIVE') tenantStatus = 'CANCELLED';

    const updateRes = await this.postgres.query(
      `UPDATE tenants SET status = $1::"TenantStatus", "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
      [tenantStatus, id],
    );

    return { success: true, client: updateRes.rows[0] };
  }

  async deleteClient(id: string, actor: SessionContext) {
    const clientRes = await this.postgres.query(
      `SELECT id, "parentId" FROM tenants WHERE id = $1`,
      [id],
    );
    if (clientRes.rows.length === 0) {
      throw new NotFoundException('Client not found');
    }
    const client = clientRes.rows[0];

    if (actor.role !== Role.SUPER_ADMIN && client.parentId !== actor.tenantId) {
      throw new ForbiddenException('Access denied: Client does not belong to your organization');
    }

    try {
      await this.postgres.query(`DELETE FROM tenants WHERE id = $1`, [id]);
      return { success: true, message: 'Client organization deleted successfully' };
    } catch {
      await this.postgres.query(
        `UPDATE tenants SET status = 'CANCELLED'::"TenantStatus", "updatedAt" = NOW() WHERE id = $1`,
        [id],
      );
      return { success: true, message: 'Client organization cancelled successfully' };
    }
  }

  // ==========================================
  // CLIENT GUEST LOGIN / IMPERSONATION
  // ==========================================
  async loginAsGuest(clientId: string, actor: SessionContext, ip?: string) {
    // 1. Fetch target client organization
    const clientRes = await this.postgres.query(
      `SELECT t.id, t.name, t.slug, t.tier, t.path, t."parentId"
       FROM tenants t WHERE t.id = $1`,
      [clientId],
    );

    if (clientRes.rows.length === 0) {
      throw new NotFoundException('Client organization not found');
    }
    const client = clientRes.rows[0];

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
    const userRes = await this.postgres.query(
      `SELECT id, name, email, role, "tenantId" FROM users
       WHERE "tenantId" = $1 AND role = 'TENANT_ADMIN'::"Role"
       ORDER BY "createdAt" ASC LIMIT 1`,
      [client.id],
    );
    let clientAdminUser = userRes.rows[0];
    if (!clientAdminUser) {
      const fallbackUserRes = await this.postgres.query(
        `SELECT id, name, email, role, "tenantId" FROM users
         WHERE "tenantId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
        [client.id],
      );
      clientAdminUser = fallbackUserRes.rows[0];
    }

    if (!clientAdminUser) {
      const tempEmail = `admin.${client.slug}@workspace.local`;
      const tempPasswordHash = await bcrypt.hash(randomUUID(), 12);
      const newUserId = randomUUID();
      const insertUserRes = await this.postgres.query(
        `INSERT INTO users (
          id, email, "passwordHash", name, role, "tenantId",
          language, theme, "twoFactorEnabled", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, 'TENANT_ADMIN'::"Role", $5,
          'en', 'system', false, NOW(), NOW()
        ) RETURNING id, name, email, role, "tenantId"`,
        [newUserId, tempEmail, tempPasswordHash, `${client.name} Administrator`, client.id],
      );
      clientAdminUser = insertUserRes.rows[0];
    }

    // Ensure the client workspace has an active subscription record
    let activePlanName = 'Professional Tier';
    try {
      const subCheck = await this.postgres.query(
        `SELECT id, "planName" FROM subscriptions WHERE "tenantId" = $1 AND status IN ('ACTIVE', 'TRIALING') LIMIT 1`,
        [client.id],
      );
      if (subCheck.rows.length === 0) {
        const subId = randomUUID();
        const totalDays = 90;
        const currentPeriodEnd = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
        await this.postgres.query(
          `INSERT INTO subscriptions (
            id, "tenantId", "planId", "planName", "price", status,
            "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
            "maxBots", "maxMessages", "maxTeamSeats", "usedBots", "usedMessages", "usedTeamSeats",
            "isTrial", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, 'pro', 'Professional Tier', '₹2,999/mo', 'ACTIVE'::"SubscriptionStatus",
            $3, $3, NOW(), $4,
            5, 10000, 5, 0, 0, 1,
            false, NOW(), NOW()
          ) ON CONFLICT (id) DO NOTHING`,
          [subId, client.id, totalDays, currentPeriodEnd],
        );
      } else {
        activePlanName = subCheck.rows[0].planName || 'Professional Tier';
      }
    } catch (err: any) {
      this.logger.warn(`Failed to verify/auto-seed client subscription on guest login: ${err.message}`);
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
      ['*'],
      { impersonatedWorkspaceId: client.id, isImpersonated: true },
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
    const activeSub = client.subscriptions?.[0] || null;

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
        plan: activeSub?.planName || activePlanName || 'Professional Tier',
        walletBalance: client.wallet?.balance || 0,
        whatsappStatus: 'Connected',
      },
    };
  }
}
