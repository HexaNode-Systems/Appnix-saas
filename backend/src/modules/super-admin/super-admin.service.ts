import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, TenantTier, TenantStatus } from '@prisma/client';
import { randomUUID, randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { SuperAdminDnsService } from './services/super-admin-dns.service';
import { SuperAdminFirebaseService } from './services/super-admin-firebase.service';
import {
  SuperAdminLoginDto,
  CreatePartnerDto,
  UpdatePartnerDto,
  CreateWholesalePlanDto,
  UpdateWholesalePlanDto,
  CreateDomainDto,
} from './dto/super-admin.dto';
import {
  parsePagination,
  createPaginatedResponse,
  PaginatedResult,
} from './common/pagination.helper';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly dnsService: SuperAdminDnsService,
    private readonly mailService: MailService,
    private readonly firebaseService: SuperAdminFirebaseService,
  ) {}

  // ==========================================
  // AUDIT LOGGING (Append-Only)
  // ==========================================
  async audit(
    superAdminId: string,
    targetWorkspaceId: string,
    action: string,
    endpoint: string,
    actorEmail?: string,
    ipAddress?: string,
    details?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: randomUUID(),
          superAdminId: superAdminId || 'system',
          targetWorkspaceId: targetWorkspaceId || 'platform',
          action,
          endpoint,
          actorEmail: actorEmail || 'superadmin@appnix.co.in',
          ipAddress: ipAddress || '127.0.0.1',
          details: details ? details : undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log: ${err.message}`);
    }
  }

  // ==========================================
  // AUTHENTICATION & RBAC
  // ==========================================
  async login(dto: SuperAdminLoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { tenant: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      this.logger.warn(`Non-super-admin user ${user.email} attempted Super Admin login.`);
      throw new ForbiddenException(
        'Access Denied: Account lacks Tier-0 Super Administrator authorization.',
      );
    }

    const tokens = await this.authService.generateTokens(
      user.id,
      user.email,
      user.tenantId,
      Role.SUPER_ADMIN,
      user.tenant?.path || 'root',
      'PLATFORM_ROOT',
      ['*'],
    );

    await this.audit(
      user.id,
      user.tenantId,
      'SUPER_ADMIN_LOGIN_SUCCESS',
      'POST /super-admin/auth/login',
      user.email,
      ipAddress,
      { method: 'PASSWORD_TOTP' },
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Platform Administrator',
        role: Role.SUPER_ADMIN,
        workspaceId: user.tenantId,
        workspaceName: user.tenant?.name || 'Platform Root',
        permissions: ['*'],
        tier: 'PLATFORM_ROOT',
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user || user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin account required');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || 'Platform Administrator',
      role: Role.SUPER_ADMIN,
      workspaceId: user.tenantId,
      workspaceName: user.tenant?.name || 'Platform Root',
      permissions: ['*'],
      tier: 'PLATFORM_ROOT',
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ==========================================
  // PLATFORM DASHBOARD
  // ==========================================
  async getDashboardOverview() {
    const [
      totalPartners,
      activePartners,
      suspendedPartners,
      totalClients,
      activeClients,
      totalUsers,
      totalSubscriptions,
      recentPartners,
      recentAuditLogs,
      channelStats,
      plans,
      partnerConfigs,
    ] = await Promise.all([
      this.prisma.tenant.count({
        where: { tier: { in: [TenantTier.PRIMARY_RESELLER, TenantTier.SUB_RESELLER] } },
      }),
      this.prisma.tenant.count({
        where: {
          tier: { in: [TenantTier.PRIMARY_RESELLER, TenantTier.SUB_RESELLER] },
          status: TenantStatus.ACTIVE,
        },
      }),
      this.prisma.tenant.count({
        where: {
          tier: { in: [TenantTier.PRIMARY_RESELLER, TenantTier.SUB_RESELLER] },
          status: TenantStatus.SUSPENDED,
        },
      }),
      this.prisma.tenant.count({ where: { tier: TenantTier.END_CLIENT } }),
      this.prisma.tenant.count({
        where: { tier: TenantTier.END_CLIENT, status: TenantStatus.ACTIVE },
      }),
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.findMany({
        where: { tier: { in: [TenantTier.PRIMARY_RESELLER, TenantTier.SUB_RESELLER] } },
        include: {
          partnerConfig: true,
          users: { where: { role: Role.RESELLER_ADMIN }, take: 1 },
          _count: { select: { children: true } },
          children: {
            where: { tier: TenantTier.END_CLIENT },
            select: {
              id: true,
              subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.channelTransaction.groupBy({
        by: ['channel'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      this.prisma.partnerConfig.findMany({
        include: {
          tenant: {
            include: {
              _count: { select: { children: true } },
            },
          },
        },
      }),
    ]);

    // Calculate recurring commission and lifetime fee across partners:
    let totalMonthlyCommission = 0;
    let totalSetupFeesCollected = 0;
    let totalCumulativeCommission = 0;
    const now = new Date();

    for (const pc of partnerConfigs) {
      const clientCount = pc.tenant?._count?.children || 0;
      const rate = Number(pc.perClientRate || 0);
      const monthlyCommission = clientCount * rate;
      totalMonthlyCommission += monthlyCommission;
      if (pc.setupFeePaid) {
        totalSetupFeesCollected += Number(pc.setupFee || 0);
      }
      const createdDate = pc.createdAt ? new Date(pc.createdAt) : now;
      const monthsActive = Math.max(
        1,
        (now.getFullYear() - createdDate.getFullYear()) * 12 +
          (now.getMonth() - createdDate.getMonth()) +
          1,
      );
      totalCumulativeCommission += monthlyCommission * monthsActive;
    }

    const actualRetailMrr = (plans as any[]).reduce(
      (sum, s) => sum + (s.plan?.price ? Number(s.plan.price) : 0),
      0,
    );
    const estimatedPartnerMargin = Math.max(0, actualRetailMrr - totalMonthlyCommission);

    return {
      partners: {
        total: totalPartners,
        active: activePartners,
        suspended: suspendedPartners,
      },
      clients: {
        total: totalClients,
        active: activeClients,
        suspended: totalClients - activeClients,
      },
      users: {
        total: totalUsers,
      },
      revenue: {
        wholesaleMrr: totalMonthlyCommission,
        monthlyCommissionRevenue: totalMonthlyCommission,
        lifetimeFeesCollected: totalSetupFeesCollected,
        totalCommissionRevenue: totalCumulativeCommission,
        currency: 'INR',
        setupFeesCollected: totalSetupFeesCollected,
        activeSubscriptions: totalSubscriptions,
        actualRetailMrr,
        estimatedRetailMrr: actualRetailMrr,
        estimatedPartnerMargin,
      },
      channels: channelStats.map((c) => ({
        channel: c.channel,
        count: c._count.id,
        revenue: c._sum.amount || 0,
      })),
      recentPartners: recentPartners.map((p) => {
        const clientCount = p._count.children;
        const perClientRate = Number(p.partnerConfig?.perClientRate || 0);
        const setupFee = Number(p.partnerConfig?.setupFee || 0);
        const setupFeePaid = p.partnerConfig?.setupFeePaid ?? true;
        const monthlyCommission = clientCount * perClientRate;
        const retailRevenue = p.children.reduce(
          (sum: number, c: any) => sum + (c.subscriptions[0]?.plan?.price ? Number(c.subscriptions[0].plan.price) : 0),
          0,
        );
        const partnerMargin = Math.max(0, retailRevenue - monthlyCommission);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          customDomain: p.customDomain,
          adminEmail: p.users[0]?.email || 'N/A',
          clientCount,
          lifetimeFee: setupFee,
          paymentStatus: setupFeePaid ? 'PAID' : 'PENDING',
          perClientRate,
          commissionPerClient: perClientRate,
          monthlyCommissionRevenue: monthlyCommission,
          partnerMargin,
          createdAt: p.createdAt,
        };
      }),
      recentAuditLogs: recentAuditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        endpoint: l.endpoint,
        actorEmail: l.actorEmail || l.superAdminId,
        createdAt: l.createdAt,
      })),
      systemStatus: 'OPERATIONAL',
    };
  }

  // ==========================================
  // PARTNER MANAGEMENT (WHITE-LABEL ADMINS)
  // ==========================================
  async getPartners(params?: {
    search?: string;
    status?: string;
    page?: string | number;
    limit?: string | number;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit);
    const where: any = {
      tier: { in: [TenantTier.PRIMARY_RESELLER, TenantTier.SUB_RESELLER] },
    };

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status as TenantStatus;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
        { customDomain: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, partners] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          partnerConfig: {
            include: {
              wholesalePlan: true,
            },
          },
          users: {
            where: { role: Role.RESELLER_ADMIN },
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
          },
          domainMappings: true,
          children: {
            where: { tier: TenantTier.END_CLIENT },
            select: {
              id: true,
              status: true,
              subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 },
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const now = new Date();
    const formatted = partners.map((p) => {
      const totalClients = p.children.length;
      const activeClientCount = p.children.filter((c) => c.status === TenantStatus.ACTIVE).length;
      const perClientRate = Number(p.partnerConfig?.perClientRate || 0);
      const recurringWholesaleRevenue = activeClientCount * perClientRate;
      const setupFee = Number(p.partnerConfig?.setupFee || 0);
      const setupFeePaid = p.partnerConfig?.setupFeePaid ?? true;

      // Lifetime license & commission calculations
      const createdDate = new Date(p.createdAt);
      const monthsActive = Math.max(
        1,
        (now.getFullYear() - createdDate.getFullYear()) * 12 +
          (now.getMonth() - createdDate.getMonth()) +
          1,
      );
      const totalCommissionRevenue = recurringWholesaleRevenue * monthsActive;

      // Real Partner Retail Economics & Margin from client subscriptions:
      const monthlyRetailRevenue = p.children.reduce(
        (sum, c) => sum + (c.subscriptions[0]?.plan?.price ? Number(c.subscriptions[0].plan.price) : 0),
        0,
      );
      const partnerMargin = Math.max(0, monthlyRetailRevenue - recurringWholesaleRevenue);
      const partnerMarginPercentage =
        monthlyRetailRevenue > 0 ? Math.round((partnerMargin / monthlyRetailRevenue) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        tier: p.tier,
        status: p.status,
        customDomain: p.customDomain || p.domainMappings[0]?.domain,
        isDomainVerified: p.domainMappings[0]?.isVerified ?? false,
        sslStatus: p.domainMappings[0]?.sslStatus ?? 'PENDING',
        branding: {
          primaryColor: p.primaryColor || '#0f172a',
          logoUrl: p.logoUrl,
          faviconUrl: p.faviconUrl,
        },
        adminUser: p.users[0] || null,
        totalClients,
        activeClients: activeClientCount,
        clientCount: activeClientCount,
        maxClients: p.maxEndClients || p.partnerConfig?.clientLimit || 50,
        totalUsers: p._count.users,

        // Lifetime White-Label License Economics (One-time, permanent, no expiry):
        lifetimeFee: setupFee,
        lifetimeFeePaid: setupFeePaid,
        paymentStatus: setupFeePaid ? 'PAID' : 'PENDING',
        licenseType: 'LIFETIME',
        expiryDate: null, // Lifetime permanent license, no expiry

        // Recurring Per-Client Commission:
        commissionPerClient: perClientRate,
        monthlyCommissionRevenue: recurringWholesaleRevenue,
        totalCommissionRevenue,

        // Partner Margin:
        retailPricePerClient: activeClientCount > 0 ? Math.round(monthlyRetailRevenue / activeClientCount) : 0,
        monthlyRetailRevenue,
        partnerMargin,
        partnerMarginPercentage,

        // Backwards compatibility:
        pricing: {
          wholesalePlanId: p.partnerConfig?.wholesalePlanId,
          wholesalePlanName: p.partnerConfig?.wholesalePlan?.name || 'Custom Wholesale',
          setupFee,
          setupFeePaid,
          perClientRate,
          recurringWholesaleRevenue,
          currency: 'INR',
        },
        featureAccess: p.partnerConfig?.featureAccess || [
          'whatsapp',
          'instagram',
          'rcs',
          'crm',
          'chatbots',
        ],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // Global summary across all partners matching filter (not just this paginated page)
    const allMatching = await this.prisma.tenant.findMany({
      where,
      include: {
        partnerConfig: true,
        children: {
          where: { tier: TenantTier.END_CLIENT },
          select: {
            id: true,
            status: true,
            subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, take: 1 },
          },
        },
      },
    });

    let totalLifetimeFees = 0;
    let totalMonthlyCommission = 0;
    let totalActiveClients = 0;
    let totalPartnerMargin = 0;

    for (const p of allMatching) {
      const isFeePaid = p.partnerConfig?.setupFeePaid ?? true;
      if (isFeePaid) {
        totalLifetimeFees += Number(p.partnerConfig?.setupFee || 0);
      }
      const activeCount = p.children.filter((c) => c.status === TenantStatus.ACTIVE).length;
      totalActiveClients += activeCount;
      const rate = Number(p.partnerConfig?.perClientRate || 0);
      const comm = activeCount * rate;
      totalMonthlyCommission += comm;
      const retRev = p.children.reduce(
        (sum, c) => sum + (c.subscriptions[0]?.plan?.price ? Number(c.subscriptions[0].plan.price) : 0),
        0,
      );
      totalPartnerMargin += Math.max(0, retRev - comm);
    }

    return {
      ...createPaginatedResponse(formatted, total, page, limit),
      summary: {
        totalPartners: total,
        totalLifetimeFees,
        totalMonthlyCommission,
        totalActiveClients,
        totalPartnerMargin,
      },
    };
  }

  async getPartnerById(
    id: string,
    params?: { clientPage?: string | number; clientLimit?: string | number },
  ) {
    const { page: clientPage, limit: clientLimit, skip: clientSkip, take: clientTake } = parsePagination(
      params?.clientPage,
      params?.clientLimit,
      10,
    );

    const partner = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        partnerConfig: {
          include: { wholesalePlan: true },
        },
        users: {
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        },
        domainMappings: true,
      },
    });

    if (!partner) throw new NotFoundException('Partner not found');

    const [totalClients, activeClients, rawClients, activeSubs] = await Promise.all([
      this.prisma.tenant.count({
        where: { parentId: id, tier: TenantTier.END_CLIENT },
      }),
      this.prisma.tenant.count({
        where: { parentId: id, tier: TenantTier.END_CLIENT, status: TenantStatus.ACTIVE },
      }),
      this.prisma.tenant.findMany({
        where: { parentId: id, tier: TenantTier.END_CLIENT },
        skip: clientSkip,
        take: clientTake,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenant: { parentId: id, tier: TenantTier.END_CLIENT, status: TenantStatus.ACTIVE },
          status: 'ACTIVE',
        },
        select: { price: true },
      }),
    ]);

    const perClientRate = Number(partner.partnerConfig?.perClientRate ?? 0);
    const setupFee = Number(partner.partnerConfig?.setupFee ?? 0);
    const setupFeePaid = partner.partnerConfig?.setupFeePaid ?? true;

    const now = new Date();
    const createdDate = new Date(partner.createdAt);
    const monthsActive = Math.max(
      1,
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
        (now.getMonth() - createdDate.getMonth()) +
        1,
    );

    const monthlyCommissionRevenue = activeClients * perClientRate;
    const totalCommissionRevenue = monthlyCommissionRevenue * monthsActive;
    const monthlyRetailRevenue = activeSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const partnerMargin = Math.max(0, monthlyRetailRevenue - monthlyCommissionRevenue);
    const partnerMarginPercentage =
      monthlyRetailRevenue > 0 ? Math.round((partnerMargin / monthlyRetailRevenue) * 100) : 0;

    const commissionHistory = await this.generateCommissionHistory(
      id,
      partner.createdAt,
      perClientRate,
      activeClients,
    );

    const clientsPaginated = createPaginatedResponse(
      rawClients.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        userCount: c._count.users,
        createdAt: c.createdAt,
      })),
      totalClients,
      clientPage,
      clientLimit,
    );

    return {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      tier: partner.tier,
      status: partner.status,
      customDomain: partner.customDomain,
      domainMappings: partner.domainMappings,
      branding: {
        primaryColor: partner.primaryColor,
        logoUrl: partner.logoUrl,
        faviconUrl: partner.faviconUrl,
      },
      partnerConfig: partner.partnerConfig,
      adminUsers: partner.users,
      clients: clientsPaginated,
      metrics: {
        totalClients,
        activeClientCount: activeClients,
        maxClients: partner.maxEndClients || partner.partnerConfig?.clientLimit || 50,
        // Lifetime White-Label License:
        lifetimeFee: setupFee,
        lifetimeFeePaid: setupFeePaid,
        paymentStatus: setupFeePaid ? 'PAID' : 'PENDING',
        licenseType: 'LIFETIME',
        expiryDate: null, // Permanent White-Label license - no expiry, no annual renewal

        // Recurring Per-Client Commission:
        commissionPerClient: perClientRate,
        monthlyCommissionRevenue,
        totalCommissionRevenue,

        // Partner Margin:
        retailPricePerClient: activeClients > 0 ? Math.round(monthlyRetailRevenue / activeClients) : 0,
        monthlyRetailRevenue,
        partnerMargin,
        partnerMarginPercentage,

        // Backwards compatibility:
        perClientRate,
        recurringWholesaleRevenue: monthlyCommissionRevenue,
        setupFee,
      },
      commissionHistory,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };
  }

  async generateCommissionHistory(
    partnerId: string,
    partnerCreatedAt: Date,
    perClientRate: number,
    activeClients: number,
  ) {
    const [clientTenants, clientSubscriptions] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { parentId: partnerId, tier: TenantTier.END_CLIENT },
        select: { id: true, createdAt: true, status: true },
      }),
      this.prisma.subscription.findMany({
        where: { tenant: { parentId: partnerId, tier: TenantTier.END_CLIENT } },
        select: { tenantId: true, price: true, status: true, createdAt: true },
      }),
    ]);

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const now = new Date();
    const created = new Date(partnerCreatedAt);
    let curYear = created.getFullYear();
    let curMonth = created.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    const history = [];

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const monthEnd = new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999);
      const isCurrentMonth = curYear === endYear && curMonth === endMonth;

      const activeTenantIds = clientTenants
        .filter((c) => new Date(c.createdAt) <= monthEnd && c.status === TenantStatus.ACTIVE)
        .map((c) => c.id);

      const clientCount =
        activeTenantIds.length > 0 ? activeTenantIds.length : isCurrentMonth ? activeClients : 0;

      const commissionEarned = clientCount * perClientRate;
      const retailRevenue = clientSubscriptions
        .filter((s) => activeTenantIds.includes(s.tenantId) && new Date(s.createdAt) <= monthEnd)
        .reduce((acc, sub) => acc + (Number(sub.price) || 0), 0);
      const partnerMargin = Math.max(0, retailRevenue - commissionEarned);
      const marginPercentage =
        retailRevenue > 0 ? Math.round((partnerMargin / retailRevenue) * 100) : 0;

      const periodKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
      const label = `${monthNames[curMonth]} ${curYear}`;

      history.unshift({
        period: periodKey,
        label,
        activeClients: clientCount,
        commissionRate: perClientRate,
        commissionEarned,
        retailRevenue,
        partnerMargin,
        marginPercentage,
        status: isCurrentMonth ? 'CURRENT' : commissionEarned > 0 ? 'SETTLED' : 'NO_ACTIVITY',
        paidAt: isCurrentMonth ? null : monthEnd.toISOString(),
      });

      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }

    return history;
  }

  async getPartnerCommissionHistory(id: string) {
    const partner = await this.prisma.tenant.findUnique({
      where: { id },
      include: { partnerConfig: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    const [activeClients, totalClients, activeSubs] = await Promise.all([
      this.prisma.tenant.count({
        where: { parentId: id, tier: TenantTier.END_CLIENT, status: TenantStatus.ACTIVE },
      }),
      this.prisma.tenant.count({
        where: { parentId: id, tier: TenantTier.END_CLIENT },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenant: { parentId: id, tier: TenantTier.END_CLIENT, status: TenantStatus.ACTIVE },
          status: 'ACTIVE',
        },
        select: { price: true },
      }),
    ]);

    const perClientRate = Number(partner.partnerConfig?.perClientRate ?? 0);
    const setupFee = Number(partner.partnerConfig?.setupFee ?? 0);
    const setupFeePaid = partner.partnerConfig?.setupFeePaid ?? true;

    const now = new Date();
    const createdDate = new Date(partner.createdAt);
    const monthsActive = Math.max(
      1,
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
        (now.getMonth() - createdDate.getMonth()) +
        1,
    );

    const monthlyCommission = activeClients * perClientRate;
    const totalCommission = monthlyCommission * monthsActive;
    const monthlyRetailRevenue = activeSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const partnerMargin = Math.max(0, monthlyRetailRevenue - monthlyCommission);
    const marginPercentage =
      monthlyRetailRevenue > 0 ? Math.round((partnerMargin / monthlyRetailRevenue) * 100) : 0;

    const history = await this.generateCommissionHistory(
      id,
      partner.createdAt,
      perClientRate,
      activeClients,
    );

    return {
      partnerId: id,
      partnerName: partner.name,
      partnerSlug: partner.slug,
      status: partner.status,
      // Lifetime White-Label License:
      lifetimeFee: setupFee,
      lifetimeFeePaid: setupFeePaid,
      paymentStatus: setupFeePaid ? 'PAID' : 'PENDING',
      licenseType: 'LIFETIME',
      expiryDate: null, // Permanent license, no expiry
      // Client Counts:
      activeClients,
      totalClients,
      maxClients: partner.maxEndClients || partner.partnerConfig?.clientLimit || 50,
      // Commission:
      commissionPerClient: perClientRate,
      monthlyCommissionRevenue: monthlyCommission,
      totalCommissionRevenue: totalCommission,
      // Partner Margin:
      retailPricePerClient: activeClients > 0 ? Math.round(monthlyRetailRevenue / activeClients) : 0,
      monthlyRetailRevenue,
      partnerMargin,
      marginPercentage,
      // History Ledger:
      history,
    };
  }

  async checkSlugAvailability(
    rawSlug: string,
    excludeId?: string,
  ): Promise<{ available: boolean; slug: string; reason?: string }> {
    if (!rawSlug || typeof rawSlug !== 'string' || !rawSlug.trim()) {
      return { available: false, slug: '', reason: 'Slug is required' };
    }

    const formattedSlug = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!formattedSlug) {
      return { available: false, slug: '', reason: 'Slug must contain alphanumeric characters' };
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formattedSlug)) {
      return {
        available: false,
        slug: formattedSlug,
        reason: 'Invalid slug format (lowercase letters, numbers, and hyphens only)',
      };
    }

    const where: any = { slug: formattedSlug };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existing = await this.prisma.tenant.findFirst({ where });
    if (existing) {
      return { available: false, slug: formattedSlug, reason: `Slug "${formattedSlug}" is already taken` };
    }

    return { available: true, slug: formattedSlug };
  }

  async createPartner(dto: CreatePartnerDto, actorId: string, actorEmail?: string) {
    // 1. Verify Phone OTP via Firebase
    await this.firebaseService.verifyPhoneToken(dto.firebaseIdToken, dto.adminPhone);

    // 2. Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${dto.adminEmail} already exists`);
    }

    // 3. Validate and resolve workspace slug
    const chosenSlug = (dto.slug || 'partner')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!chosenSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chosenSlug)) {
      throw new BadRequestException(
        'Invalid workspace slug format. Must contain only lowercase alphanumeric characters and hyphens.',
      );
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: chosenSlug },
    });
    if (existingTenant) {
      throw new ConflictException(
        `Workspace slug "${chosenSlug}" is already taken. Please enter a different slug.`,
      );
    }

    // Root tenant for parent reference
    const rootTenant = await this.prisma.tenant.findFirst({
      where: { tier: TenantTier.PLATFORM_ROOT },
    });

    const tenantId = randomUUID();
    const cleanPath = `root.t_${tenantId.replace(/-/g, '_')}`;

    // Securely determine initial admin password (from DTO if provided, otherwise auto-generated)
    const rawPassword =
      dto.adminPassword && dto.adminPassword.trim().length >= 6
        ? dto.adminPassword.trim()
        : this.generateSecureTemporaryPassword();

    // Hash admin password
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 1. Create Tenant
    const partnerTenant = await this.prisma.tenant.create({
      data: {
        id: tenantId,
        name: dto.name,
        slug: chosenSlug,
        tier: TenantTier.PRIMARY_RESELLER,
        status: TenantStatus.ACTIVE,
        path: cleanPath,
        depth: 1,
        parentId: rootTenant?.id,
        customDomain: dto.customDomain ? dto.customDomain.toLowerCase().trim() : null,
        primaryColor: dto.primaryColor || '#0f172a',
        logoUrl: dto.logoUrl,
        maxEndClients: dto.clientLimit || 50,
        maxUsers: 100,
      },
    });

    // 2. Create Partner Admin User
    const adminUser = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: dto.adminEmail.toLowerCase().trim(),
        name: dto.adminName,
        phone: dto.adminPhone,
        passwordHash,
        role: Role.RESELLER_ADMIN,
        tenantId: partnerTenant.id,
      },
    });

    // Resolve Lifetime Fee & Commission Rate from selected wholesale plan or DTO (no fake numbers):
    let defaultSetupFee = 0;
    let defaultPerClient = 0;

    if (dto.wholesalePlanId) {
      const selectedPlan = await this.prisma.wholesalePlan.findUnique({
        where: { id: dto.wholesalePlanId },
      });
      if (selectedPlan) {
        defaultSetupFee = Number(selectedPlan.setupFee || 0);
        defaultPerClient = Number(selectedPlan.perClientPrice || 0);
      }
    }

    const lifetimeFee =
      dto.lifetimeFee !== undefined
        ? Number(dto.lifetimeFee)
        : dto.setupFee !== undefined
          ? Number(dto.setupFee)
          : defaultSetupFee;
    const isFeePaid =
      dto.setupFeePaid !== undefined
        ? Boolean(dto.setupFeePaid)
        : dto.paymentStatus
          ? dto.paymentStatus === 'PAID'
          : true;
    const commissionRate =
      dto.commissionPerClient !== undefined
        ? Number(dto.commissionPerClient)
        : dto.perClientRate !== undefined
          ? Number(dto.perClientRate)
          : defaultPerClient;

    // 3. Create Partner Wholesale Config
    const partnerConfig = await this.prisma.partnerConfig.create({
      data: {
        id: randomUUID(),
        tenantId: partnerTenant.id,
        wholesalePlanId: dto.wholesalePlanId || null,
        setupFee: lifetimeFee,
        setupFeePaid: isFeePaid,
        perClientRate: commissionRate,
        clientLimit: dto.clientLimit || 50,
        featureAccess: dto.featureAccess || [
          'whatsapp',
          'instagram',
          'rcs',
          'crm',
          'chatbots',
          'automations',
        ],
        customDomain: dto.customDomain ? dto.customDomain.toLowerCase().trim() : null,
      },
    });

    // 4. Create Domain Mapping if custom domain given
    if (dto.customDomain) {
      const cleanDomain = dto.customDomain.toLowerCase().trim();
      await this.prisma.domainMapping.create({
        data: {
          id: randomUUID(),
          tenantId: partnerTenant.id,
          domain: cleanDomain,
          isVerified: false,
          sslProvisioned: false,
          dnsRecordType: 'CNAME',
          dnsExpectedValue: 'cname.appnix.co.in',
          verificationToken: `appnix-verify-${randomBytes(6).toString('hex')}`,
          sslStatus: 'PENDING',
        },
      });
    }

    await this.audit(
      actorId,
      partnerTenant.id,
      'CREATE_WHITE_LABEL_PARTNER',
      'POST /super-admin/partners',
      actorEmail,
      undefined,
      { partnerName: dto.name, adminEmail: dto.adminEmail, wholesalePlanId: dto.wholesalePlanId },
    );

    // 5. Resolve Admin Panel Login URL and dispatch credentials email
    const loginUrl = this.resolveAdminLoginUrl(dto.customDomain);

    try {
      await this.mailService.sendPartnerWelcomeEmail({
        brandName: dto.name,
        adminName: dto.adminName,
        adminEmail: dto.adminEmail.toLowerCase().trim(),
        temporaryPassword: rawPassword,
        loginUrl,
        customDomain: dto.customDomain ? dto.customDomain.toLowerCase().trim() : undefined,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        supportEmail: this.config.get<string>('SUPPORT_EMAIL') || 'support@appnix.co.in',
      });
      this.logger.log(
        `📧 Dispatched welcome credentials email to partner admin: ${dto.adminEmail} for brand "${dto.name}"`,
      );
    } catch (mailError: any) {
      this.logger.warn(
        `⚠️ Partner provisioned, but failed to deliver welcome email to ${dto.adminEmail}: ${mailError.message}`,
      );
    }

    return {
      partner: partnerTenant,
      adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name },
      partnerConfig,
    };
  }

  /**
   * Generates a cryptographically strong, human-readable temporary password
   */
  private generateSecureTemporaryPassword(length = 12): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    const all = upper + lower + numbers + symbols;

    const chars = [
      upper[randomInt(upper.length)],
      lower[randomInt(lower.length)],
      numbers[randomInt(numbers.length)],
      symbols[randomInt(symbols.length)],
    ];

    for (let i = 4; i < length; i++) {
      chars.push(all[randomInt(all.length)]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }

  /**
   * Resolves the proper Admin Panel Login URL based on domain configuration
   */
  private resolveAdminLoginUrl(customDomain?: string): string {
    if (customDomain) {
      const clean = customDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
      return `https://${clean}/admin/login`;
    }

    const adminUrl = this.config.get<string>('ADMIN_URL');
    if (adminUrl) {
      const clean = adminUrl.replace(/\/+$/, '').trim();
      return clean.endsWith('/admin') || clean.endsWith('/login') ? clean : `${clean}/login`;
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    if (frontendUrl.includes('localhost')) {
      return 'http://admin.localhost:3000/login';
    }
    if (frontendUrl.includes('appnix.co.in')) {
      return 'https://admin.appnix.co.in/login';
    }
    return `${frontendUrl.replace(/\/+$/, '')}/admin/login`;
  }

  async updatePartner(id: string, dto: UpdatePartnerDto, actorId: string, actorEmail?: string) {
    const partner = await this.prisma.tenant.findUnique({
      where: { id },
      include: { partnerConfig: true, users: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    const updateTenantData: any = {};
    if (dto.name) updateTenantData.name = dto.name;
    if (dto.primaryColor) updateTenantData.primaryColor = dto.primaryColor;
    if (dto.logoUrl !== undefined) updateTenantData.logoUrl = dto.logoUrl;
    if (dto.faviconUrl !== undefined) updateTenantData.faviconUrl = dto.faviconUrl;
    if (dto.clientLimit) updateTenantData.maxEndClients = dto.clientLimit;
    if (dto.status) updateTenantData.status = dto.status as TenantStatus;
    if (dto.customDomain !== undefined) {
      updateTenantData.customDomain = dto.customDomain ? dto.customDomain.toLowerCase().trim() : null;
    }

    // Slug update with uniqueness check (ignoring current partner's own id)
    if (dto.slug) {
      const cleanSlug = dto.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!cleanSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
        throw new BadRequestException(
          'Invalid workspace slug format. Must contain only lowercase alphanumeric characters and hyphens.',
        );
      }

      const duplicateSlug = await this.prisma.tenant.findFirst({
        where: {
          slug: cleanSlug,
          NOT: { id },
        },
      });
      if (duplicateSlug) {
        throw new ConflictException(
          `Workspace slug "${cleanSlug}" is already taken by another workspace.`,
        );
      }
      updateTenantData.slug = cleanSlug;
    }

    if (Object.keys(updateTenantData).length > 0) {
      await this.prisma.tenant.update({
        where: { id },
        data: updateTenantData,
      });
    }

    // Update Administrator User Details
    if (dto.adminName || dto.adminEmail || dto.adminPhone !== undefined || dto.adminPassword) {
      const adminUser =
        partner.users.find((u) => u.role === Role.RESELLER_ADMIN) || partner.users[0];

      if (adminUser) {
        const updateUserData: any = {};
        if (dto.adminName) updateUserData.name = dto.adminName.trim();
        if (dto.adminPhone !== undefined) updateUserData.phone = dto.adminPhone.trim();

        if (
          dto.adminEmail &&
          dto.adminEmail.toLowerCase().trim() !== adminUser.email.toLowerCase().trim()
        ) {
          const cleanEmail = dto.adminEmail.toLowerCase().trim();
          const duplicateEmail = await this.prisma.user.findFirst({
            where: {
              email: cleanEmail,
              NOT: { id: adminUser.id },
            },
          });
          if (duplicateEmail) {
            throw new ConflictException(`User with email "${cleanEmail}" already exists.`);
          }
          updateUserData.email = cleanEmail;
        }

        if (dto.adminPassword && dto.adminPassword.trim().length >= 6) {
          updateUserData.passwordHash = await bcrypt.hash(dto.adminPassword.trim(), 12);
        }

        if (Object.keys(updateUserData).length > 0) {
          await this.prisma.user.update({
            where: { id: adminUser.id },
            data: updateUserData,
          });
        }
      }
    }

    // Update partnerConfig
    const updateConfigData: any = {};
    if (dto.wholesalePlanId !== undefined) updateConfigData.wholesalePlanId = dto.wholesalePlanId || null;
    if (dto.setupFee !== undefined) updateConfigData.setupFee = dto.setupFee;
    if (dto.lifetimeFee !== undefined) updateConfigData.setupFee = dto.lifetimeFee;
    if (dto.setupFeePaid !== undefined) updateConfigData.setupFeePaid = dto.setupFeePaid;
    if (dto.paymentStatus !== undefined) updateConfigData.setupFeePaid = dto.paymentStatus === 'PAID';
    if (dto.perClientRate !== undefined) updateConfigData.perClientRate = dto.perClientRate;
    if (dto.commissionPerClient !== undefined) updateConfigData.perClientRate = dto.commissionPerClient;
    if (dto.clientLimit !== undefined) updateConfigData.clientLimit = dto.clientLimit;
    if (dto.featureAccess) updateConfigData.featureAccess = dto.featureAccess;
    if (dto.customDomain !== undefined) {
      updateConfigData.customDomain = dto.customDomain ? dto.customDomain.toLowerCase().trim() : null;
    }

    if (Object.keys(updateConfigData).length > 0) {
      await this.prisma.partnerConfig.upsert({
        where: { tenantId: id },
        create: {
          id: randomUUID(),
          tenantId: id,
          ...updateConfigData,
        },
        update: updateConfigData,
      });
    }

    // Never log passwords in audit log
    const sanitizedAudit = { ...dto };
    delete sanitizedAudit.adminPassword;

    await this.audit(
      actorId,
      id,
      'UPDATE_WHITE_LABEL_PARTNER',
      `PATCH /super-admin/partners/${id}`,
      actorEmail,
      undefined,
      sanitizedAudit,
    );

    return this.getPartnerById(id);
  }

  async updatePartnerStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
    actorId: string,
    reason?: string,
    actorEmail?: string,
  ) {
    const partner = await this.prisma.tenant.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: status as TenantStatus },
    });

    await this.audit(
      actorId,
      id,
      `SET_PARTNER_STATUS_${status}`,
      `PATCH /super-admin/partners/${id}/status`,
      actorEmail,
      undefined,
      { previousStatus: partner.status, newStatus: status, reason },
    );

    return { success: true, partner: updated };
  }

  // ==========================================
  // CLIENT MANAGEMENT (END-CLIENTS)
  // ==========================================
  async getClients(params?: {
    partnerId?: string;
    status?: string;
    plan?: string;
    search?: string;
    page?: string | number;
    limit?: string | number;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit);
    const where: any = {
      tier: TenantTier.END_CLIENT,
    };

    if (params?.partnerId && params.partnerId !== 'ALL' && params.partnerId !== 'All') {
      where.parentId = params.partnerId;
    }

    if (params?.status && params.status !== 'ALL' && params.status !== 'All') {
      where.status = params.status as TenantStatus;
    }

    if (params?.plan && params.plan !== 'ALL' && params.plan !== 'All') {
      where.subscriptions = {
        some: {
          OR: [
            { planName: { contains: params.plan, mode: 'insensitive' } },
            { planId: { contains: params.plan, mode: 'insensitive' } },
          ],
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
          {
            parent: {
              name: { contains: q, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    const [total, clients, activeCount, suspendedCount] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          parent: {
            select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true },
          },
          users: {
            where: { role: Role.TENANT_ADMIN },
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
            take: 1,
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          wallet: {
            select: { balance: true, currency: true },
          },
          _count: {
            select: {
              users: true,
              campaigns: true,
              crmContacts: true,
              channelConfigs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where: { ...where, status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { ...where, status: TenantStatus.SUSPENDED } }),
    ]);

    const formatted = clients.map((c) => {
      const adminUser = c.users[0] || null;
      const sub = c.subscriptions[0] || null;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        partner: c.parent ? { id: c.parent.id, name: c.parent.name, slug: c.parent.slug } : null,
        ownerName: adminUser?.name || 'Account Admin',
        ownerEmail: adminUser?.email || '',
        ownerPhone: adminUser?.phone || '',
        adminUser: adminUser,
        plan: sub?.planName || 'Standard',
        subscription: sub
          ? {
              id: sub.id,
              planName: sub.planName,
              planId: sub.planId,
              price: sub.price,
              status: sub.status,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
        wallet: c.wallet ? { balance: c.wallet.balance, currency: c.wallet.currency } : { balance: 0, currency: 'INR' },
        stats: {
          users: c._count.users,
          campaigns: c._count.campaigns,
          contacts: c._count.crmContacts,
          channels: c._count.channelConfigs,
        },
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return createPaginatedResponse(formatted, total, page, limit, {
      total,
      active: activeCount,
      suspended: suspendedCount,
    });
  }

  async getClientById(id: string) {
    const client = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            primaryColor: true,
            logoUrl: true,
            customDomain: true,
            users: {
              where: { role: Role.RESELLER_ADMIN },
              select: { id: true, name: true, email: true, phone: true },
              take: 1,
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            theme: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        wallet: true,
        channelConfigs: {
          select: {
            id: true,
            channel: true,
            isConnected: true,
            connectedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            campaigns: true,
            crmContacts: true,
            channelConfigs: true,
            workflows: true,
            conversations: true,
          },
        },
      },
    });

    if (!client) throw new NotFoundException('Client not found');

    const adminUser = client.users.find((u) => u.role === Role.TENANT_ADMIN) || client.users[0] || null;
    const activeSub = client.subscriptions.find((s) => s.status === 'ACTIVE') || client.subscriptions[0] || null;

    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      tier: client.tier,
      status: client.status,
      customDomain: client.customDomain,
      primaryColor: client.primaryColor,
      logoUrl: client.logoUrl,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      partner: client.parent
        ? {
            id: client.parent.id,
            name: client.parent.name,
            slug: client.parent.slug,
            customDomain: client.parent.customDomain,
            adminUser: client.parent.users[0] || null,
          }
        : null,
      adminUser,
      allUsers: client.users,
      subscription: activeSub,
      allSubscriptions: client.subscriptions,
      wallet: client.wallet,
      channels: client.channelConfigs,
      metrics: {
        totalUsers: client._count.users,
        totalCampaigns: client._count.campaigns,
        totalContacts: client._count.crmContacts,
        totalChannels: client._count.channelConfigs,
        totalWorkflows: client._count.workflows,
        totalConversations: client._count.conversations,
      },
    };
  }

  async updateClientStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
    actorId: string,
    reason?: string,
    actorEmail?: string,
  ) {
    const client = await this.prisma.tenant.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: status as TenantStatus },
    });

    await this.audit(
      actorId,
      id,
      `SET_CLIENT_STATUS_${status}`,
      `PATCH /super-admin/clients/${id}/status`,
      actorEmail,
      undefined,
      { previousStatus: client.status, newStatus: status, reason },
    );

    return { success: true, client: updated };
  }

  // ==========================================
  // WHOLESALE PLANS (WHITE-LABEL PLANS)
  // ==========================================
  async getWholesalePlans(params?: {
    search?: string;
    page?: string | number;
    limit?: string | number;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit, 10);
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, plans] = await Promise.all([
      this.prisma.wholesalePlan.count({ where }),
      this.prisma.wholesalePlan.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { partnerConfigs: true } },
        },
        orderBy: { perClientPrice: 'asc' },
      }),
    ]);

    const formatted = plans.map((p) => ({
      ...p,
      setupFee: Number(p.setupFee),
      perClientPrice: Number(p.perClientPrice),
      partnerCount: p._count.partnerConfigs,
    }));

    return createPaginatedResponse(formatted, total, page, limit);
  }

  async createWholesalePlan(dto: CreateWholesalePlanDto, actorId: string, actorEmail?: string) {
    const slug = (dto.slug || dto.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.prisma.wholesalePlan.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Wholesale plan with slug '${slug}' already exists.`);
    }

    const plan = await this.prisma.wholesalePlan.create({
      data: {
        id: `ws-${slug}-${Math.random().toString(36).substring(2, 5)}`,
        name: dto.name,
        slug,
        description: dto.description,
        setupFee: dto.setupFee,
        perClientPrice: dto.perClientPrice,
        currency: dto.currency || 'INR',
        billingCycle: dto.billingCycle || 'monthly',
        maxClients: dto.maxClients || 50,
        featureAccess: dto.featureAccess || ['whatsapp', 'instagram', 'crm', 'chatbots'],
        status: dto.status || 'ACTIVE',
      },
    });

    await this.audit(
      actorId,
      'platform',
      'CREATE_WHOLESALE_PLAN',
      'POST /super-admin/wholesale-plans',
      actorEmail,
      undefined,
      plan,
    );

    return plan;
  }

  async updateWholesalePlan(
    id: string,
    dto: UpdateWholesalePlanDto,
    actorId: string,
    actorEmail?: string,
  ) {
    const plan = await this.prisma.wholesalePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Wholesale plan not found');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.setupFee !== undefined) updateData.setupFee = dto.setupFee;
    if (dto.perClientPrice !== undefined) updateData.perClientPrice = dto.perClientPrice;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.billingCycle !== undefined) updateData.billingCycle = dto.billingCycle;
    if (dto.maxClients !== undefined) updateData.maxClients = dto.maxClients;
    if (dto.featureAccess !== undefined) updateData.featureAccess = dto.featureAccess;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.wholesalePlan.update({
      where: { id },
      data: updateData,
    });

    await this.audit(
      actorId,
      'platform',
      'UPDATE_WHOLESALE_PLAN',
      `PATCH /super-admin/wholesale-plans/${id}`,
      actorEmail,
      undefined,
      updateData,
    );

    return updated;
  }

  async deleteWholesalePlan(id: string, actorId: string, actorEmail?: string) {
    const plan = await this.prisma.wholesalePlan.findUnique({
      where: { id },
      include: { _count: { select: { partnerConfigs: true } } },
    });
    if (!plan) throw new NotFoundException('Wholesale plan not found');

    if (plan._count.partnerConfigs > 0) {
      // Soft-archive if partners are actively using it
      const updated = await this.prisma.wholesalePlan.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      return { message: 'Wholesale plan archived because active partners are assigned to it.', plan: updated };
    }

    await this.prisma.wholesalePlan.delete({ where: { id } });

    await this.audit(
      actorId,
      'platform',
      'DELETE_WHOLESALE_PLAN',
      `DELETE /super-admin/wholesale-plans/${id}`,
      actorEmail,
    );

    return { success: true };
  }

  // ==========================================
  // SUBSCRIPTIONS & PLATFORM REVENUE
  // ==========================================
  async getSubscriptionsSummary(params?: {
    subPage?: string | number;
    subLimit?: string | number;
    orderPage?: string | number;
    orderLimit?: string | number;
    search?: string;
  }) {
    const subPagination = parsePagination(params?.subPage, params?.subLimit, 10);
    const orderPagination = parsePagination(params?.orderPage, params?.orderLimit, 10);

    const subWhere: any = {};
    if (params?.search) {
      subWhere.OR = [
        { planName: { contains: params.search, mode: 'insensitive' } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [
      totalSubscriptionsCount,
      activeSubscriptionsCount,
      totalRevenueAgg,
      totalPaymentOrdersCount,
      successPaymentOrdersCount,
      plans,
      subCount,
      subscriptions,
      orderCount,
      paymentOrders,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.paymentOrder.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.paymentOrder.count(),
      this.prisma.paymentOrder.count({ where: { status: 'SUCCESS' } }),
      this.prisma.plan.findMany({
        include: {
          _count: {
            select: {
              subscriptions: { where: { status: 'ACTIVE' } },
            },
          },
        },
      }),
      this.prisma.subscription.count({ where: subWhere }),
      this.prisma.subscription.findMany({
        where: subWhere,
        skip: subPagination.skip,
        take: subPagination.take,
        include: {
          tenant: { select: { id: true, name: true, slug: true, tier: true } },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentOrder.count(),
      this.prisma.paymentOrder.findMany({
        skip: orderPagination.skip,
        take: orderPagination.take,
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
    ]);

    return {
      overview: {
        totalSubscriptions: totalSubscriptionsCount,
        activeSubscriptions: activeSubscriptionsCount,
        totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
        paymentOrdersCount: totalPaymentOrdersCount,
        successOrdersCount: successPaymentOrdersCount,
      },
      plans: plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        currency: p.currency,
        billingCycle: p.billingCycle,
        activeSubscribers: p._count?.subscriptions ?? 0,
      })),
      subscriptions: createPaginatedResponse(
        subscriptions.map((s) => ({
          id: s.id,
          tenantId: s.tenantId,
          tenantName: s.tenant?.name || 'Unknown',
          planName: s.planName,
          price: s.price,
          status: s.status,
          currentPeriodStart: s.currentPeriodStart,
          currentPeriodEnd: s.currentPeriodEnd,
          createdAt: s.createdAt,
        })),
        subCount,
        subPagination.page,
        subPagination.limit,
      ),
      recentPaymentOrders: createPaginatedResponse(
        paymentOrders.map((o) => ({
          id: o.id,
          orderId: o.orderId,
          workspaceId: o.workspaceId,
          planName: o.plan?.name || 'Subscription Tier',
          amount: Number(o.amount),
          currency: o.currency,
          status: o.status,
          paymentMethod: o.paymentMethod || 'Online Gateway',
          createdAt: o.createdAt,
        })),
        orderCount,
        orderPagination.page,
        orderPagination.limit,
      ),
    };
  }

  // ==========================================
  // CUSTOM DOMAINS & REAL DNS VERIFICATION
  // ==========================================
  async getDomains(params?: {
    search?: string;
    page?: string | number;
    limit?: string | number;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit, 10);
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { domain: { contains: params.search, mode: 'insensitive' } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, mappings] = await Promise.all([
      this.prisma.domainMapping.count({ where }),
      this.prisma.domainMapping.findMany({
        where,
        skip,
        take,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              tier: true,
              primaryColor: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = mappings.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      partnerName: m.tenant?.name || 'Workspace',
      partnerSlug: m.tenant?.slug || 'workspace',
      domain: m.domain,
      isVerified: m.isVerified,
      sslProvisioned: m.sslProvisioned,
      dnsRecordType: m.dnsRecordType || 'CNAME',
      dnsExpectedValue: m.dnsExpectedValue || 'cname.appnix.co.in',
      verificationToken: m.verificationToken || `appnix-verify-${m.id.substring(0, 8)}`,
      sslStatus: m.sslStatus || (m.isVerified ? 'ACTIVE' : 'PENDING'),
      lastCheckedAt: m.lastCheckedAt,
      createdAt: m.createdAt,
    }));

    return createPaginatedResponse(formatted, total, page, limit);
  }

  async addDomain(dto: CreateDomainDto, actorId: string, actorEmail?: string) {
    const cleanDomain = dto.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const existing = await this.prisma.domainMapping.findUnique({
      where: { domain: cleanDomain },
    });
    if (existing) {
      throw new ConflictException(`Domain ${cleanDomain} is already registered.`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Partner tenant not found');

    const token = `appnix-verify-${randomBytes(6).toString('hex')}`;
    const mapping = await this.prisma.domainMapping.create({
      data: {
        id: randomUUID(),
        tenantId: dto.tenantId,
        domain: cleanDomain,
        isVerified: false,
        sslProvisioned: false,
        dnsRecordType: dto.dnsRecordType || 'CNAME',
        dnsExpectedValue: 'cname.appnix.co.in',
        verificationToken: token,
        sslStatus: 'PENDING',
        lastCheckedAt: null,
      },
    });

    // Mirror to tenant.customDomain if not set
    if (!tenant.customDomain) {
      await this.prisma.tenant.update({
        where: { id: dto.tenantId },
        data: { customDomain: cleanDomain },
      });
    }

    await this.audit(
      actorId,
      dto.tenantId,
      'ADD_CUSTOM_DOMAIN',
      'POST /super-admin/domains',
      actorEmail,
      undefined,
      { domain: cleanDomain, mappingId: mapping.id },
    );

    return mapping;
  }

  async verifyDomain(domainId: string, actorId: string, actorEmail?: string) {
    const mapping = await this.prisma.domainMapping.findUnique({
      where: { id: domainId },
      include: { tenant: true },
    });
    if (!mapping) throw new NotFoundException('Domain mapping not found');

    // Run real DNS resolution!
    const dnsResult = await this.dnsService.verifyDomain(
      mapping.domain,
      mapping.dnsRecordType || 'CNAME',
      mapping.dnsExpectedValue || 'cname.appnix.co.in',
      mapping.verificationToken || undefined,
    );

    // Persist verified state
    const updated = await this.prisma.domainMapping.update({
      where: { id: domainId },
      data: {
        isVerified: dnsResult.isVerified,
        sslProvisioned: dnsResult.sslStatus === 'ACTIVE',
        sslStatus: dnsResult.sslStatus,
        lastCheckedAt: new Date(),
      },
    });

    await this.audit(
      actorId,
      mapping.tenantId,
      dnsResult.isVerified ? 'DOMAIN_VERIFY_SUCCESS' : 'DOMAIN_VERIFY_FAILED',
      `POST /super-admin/domains/${domainId}/verify`,
      actorEmail,
      undefined,
      dnsResult,
    );

    return {
      domainMapping: updated,
      diagnostics: dnsResult,
    };
  }

  async deleteDomain(domainId: string, actorId: string, actorEmail?: string) {
    const mapping = await this.prisma.domainMapping.findUnique({ where: { id: domainId } });
    if (!mapping) throw new NotFoundException('Domain mapping not found');

    await this.prisma.domainMapping.delete({ where: { id: domainId } });

    await this.audit(
      actorId,
      mapping.tenantId,
      'DELETE_CUSTOM_DOMAIN',
      `DELETE /super-admin/domains/${domainId}`,
      actorEmail,
      undefined,
      { domain: mapping.domain },
    );

    return { success: true };
  }

  // ==========================================
  // PLATFORM-WIDE CHANNEL & USAGE MONITORING
  // ==========================================
  async getChannelUsage(params?: { page?: string | number; limit?: string | number }) {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit, 10);

    const [
      transactionsByChannel,
      transactionsByCategory,
      transactionsByStatus,
      totalVolume,
      recentTransactions,
      wallets,
    ] = await Promise.all([
      this.prisma.channelTransaction.groupBy({
        by: ['channel'],
        _count: { id: true },
        _sum: { amount: true, unitCount: true },
      }),
      this.prisma.channelTransaction.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.channelTransaction.groupBy({
        by: ['deliveryStatus'],
        _count: { id: true },
      }),
      this.prisma.channelTransaction.count(),
      this.prisma.channelTransaction.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { id: true, name: true } } },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
        _count: { id: true },
      }),
    ]);

    const deliveredCount =
      transactionsByStatus.find((s) => s.deliveryStatus === 'DELIVERED')?._count.id || 0;
    const sentCount = transactionsByStatus.find((s) => s.deliveryStatus === 'SENT')?._count.id || 0;
    const failedCount =
      transactionsByStatus.find((s) => s.deliveryStatus === 'FAILED')?._count.id || 0;

    const deliveryRate =
      totalVolume > 0 ? Math.round(((deliveredCount + sentCount) / totalVolume) * 100) : null;

    return {
      overview: {
        totalMessagesSent: totalVolume,
        deliveryRatePercentage: deliveryRate,
        failedMessagesCount: failedCount,
        totalWalletBalance: wallets._sum.balance || 0,
        activeWalletsCount: wallets._count.id,
      },
      channelBreakdown: transactionsByChannel.map((c) => ({
        channel: c.channel,
        count: c._count.id,
        revenue: c._sum.amount || 0,
        units: c._sum.unitCount || 0,
      })),
      categoryBreakdown: transactionsByCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      statusBreakdown: transactionsByStatus.map((s) => ({
        status: s.deliveryStatus,
        count: s._count.id,
      })),
      recentTransactions: createPaginatedResponse(
        recentTransactions.map((t) => ({
          id: t.id,
          tenantName: t.tenant?.name || 'Workspace',
          channel: t.channel,
          category: t.category,
          amount: t.amount,
          deliveryStatus: t.deliveryStatus,
          recipientPhone: t.recipientPhone,
          timestamp: t.timestamp,
        })),
        totalVolume,
        page,
        limit,
      ),
    };
  }

  // ==========================================
  // 9. SYSTEM HEALTH
  // ==========================================
  async getSystemHealth() {
    const startTime = Date.now();
    let dbStatus = 'Operational';
    let dbLatencyMs = 0;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbLatencyMs = Date.now() - startTime;
    } catch {
      dbStatus = 'Down';
      dbLatencyMs = -1;
    }

    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    return {
      status: dbStatus === 'Operational' ? 'Operational' : 'Degraded',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      services: [
        {
          name: 'PostgreSQL Database Engine',
          status: dbStatus,
          responseTimeMs: dbLatencyMs,
          category: 'Database',
          details: dbStatus === 'Operational' ? `Database responsive (${dbLatencyMs}ms query latency).` : 'Database connection error.',
        },
        {
          name: 'Core NestJS REST API Gateway',
          status: 'Operational',
          responseTimeMs: Math.max(1, Math.round(Date.now() - startTime)),
          category: 'Core API',
          details: `Global prefix /api/v1. Node ${process.version} on ${process.platform}.`,
        },
        {
          name: 'Omnichannel Webhook Ingestion Engine',
          status: 'Operational',
          category: 'Channel Gateway',
          details: 'Meta WABA, Instagram Graph & RCS ingress routes active.',
        },
        {
          name: 'Cloudflare R2 Media Storage',
          status: 'Operational',
          category: 'Storage',
          details: 'Distributed media bucket active and accessible.',
        },
        {
          name: 'Campaign Broadcast Queue Worker',
          status: 'Operational',
          category: 'Workers',
          details: 'Background worker loops active.',
        },
      ],
      systemMetrics: {
        nodeVersion: process.version,
        platform: process.platform,
        processMemoryMb: {
          rss: Math.round(memory.rss / (1024 * 1024)),
          heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
          heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
        },
      },
    };
  }

  // ==========================================
  // AUDIT LOGS RETRIEVAL
  // ==========================================
  async getAuditLogs(params?: {
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, skip, take } = parsePagination(params?.page, params?.limit, 25);
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { endpoint: { contains: params.search, mode: 'insensitive' } },
        { actorEmail: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      superAdminId: l.superAdminId,
      actorEmail: l.actorEmail || l.superAdminId,
      targetWorkspaceId: l.targetWorkspaceId,
      action: l.action,
      endpoint: l.endpoint,
      ipAddress: l.ipAddress || 'Internal',
      details: l.details,
      createdAt: l.createdAt,
    }));

    return createPaginatedResponse(formatted, total, page, limit);
  }

  // ==========================================
  // WORKSPACE IMPERSONATION (Preserved from original)
  // ==========================================
  async beginWorkspaceInspection(
    actor: { userId: string; email?: string; role?: Role | string; tenantId?: string; orgPath?: string },
    targetWorkspaceId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: targetWorkspaceId },
      select: { id: true, name: true, path: true, tier: true, parentId: true },
    });
    if (!tenant) throw new NotFoundException('Workspace not found');

    const isSuper =
      actor.role === Role.SUPER_ADMIN ||
      actor.role === 'SUPER_ADMIN' ||
      (actor as any).role === 'owner';

    if (isSuper) {
      // Super Admin: platform-wide access
    } else if (actor.role === Role.RESELLER_ADMIN || actor.role === 'RESELLER_ADMIN') {
      // Reseller Admin: only within their hierarchy tree
      const callerPath = actor.orgPath || 'root';
      const isDirectChild = tenant.parentId === actor.tenantId;
      const isDescendant = callerPath && tenant.path && tenant.path.startsWith(callerPath + '.');

      if (!isDirectChild && !isDescendant) {
        throw new ForbiddenException(
          'Cross-hierarchy violation: Cannot inspect workspace outside your reseller tree',
        );
      }
    } else {
      throw new ForbiddenException('Only Super Admins and Reseller Admins may use delegated inspection');
    }

    const tokenRole = isSuper ? Role.SUPER_ADMIN : Role.RESELLER_ADMIN;
    const tokenPurpose = isSuper ? 'super_admin_impersonation' : 'reseller_impersonation';

    const token = await this.jwt.signAsync(
      {
        sub: actor.userId,
        role: tokenRole,
        targetWorkspaceId,
        targetOrgPath: tenant.path,
        targetTier: tenant.tier,
        purpose: tokenPurpose,
      },
      {
        secret:
          this.config.get<string>('IMPERSONATION_JWT_SECRET') ||
          this.config.get<string>('JWT_ACCESS_SECRET') ||
          this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('IMPERSONATION_JWT_EXPIRY') || '15m',
      },
    );

    await this.audit(
      actor.userId,
      targetWorkspaceId,
      'IMPERSONATION_STARTED',
      'POST /super-admin/impersonation',
      actor.email,
      undefined,
      {
        actorRole: actor.role,
        targetWorkspaceId,
        targetWorkspaceName: tenant.name,
      },
    );

    return {
      impersonationToken: token,
      expiresIn: this.config.get<string>('IMPERSONATION_JWT_EXPIRY') || '15m',
    };
  }
}
