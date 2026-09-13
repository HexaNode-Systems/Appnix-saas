import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostgresService } from '../../database/postgres.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

function formatPlanRow(p: any) {
  const mPrice = Number(p.monthlyPrice ?? p.price ?? 0);
  const yPrice = Number(p.yearlyPrice ?? (mPrice * 10));
  const trialDays = Number(p.trialDays || 0);
  const maxUsers = p.maxUsers >= 999999 ? 'Unlimited' : (p.maxUsers || 5);
  const features = Array.isArray(p.features)
    ? p.features
    : typeof p.features === 'string'
    ? JSON.parse(p.features || '[]')
    : [];

  return {
    id: p.id,
    planRefId: p.id,
    name: p.name,
    slug: p.slug || p.id,
    description: p.description || '',
    monthlyPrice: mPrice,
    yearlyPrice: yPrice,
    price: `₹${mPrice.toLocaleString('en-IN')}`,
    period: '/month',
    currency: p.currency || 'INR',
    trialDays,
    hasTrial: trialDays > 0,
    isPopular: Boolean(p.isPopular),
    userLimit: maxUsers,
    apiLimit: p.apiLimit || (p.apiQuota ? `${p.apiQuota.toLocaleString()} req/mo` : '100,000 req/mo'),
    storageLimit: p.storageLimit || (p.storageQuotaMb ? `${Math.round(p.storageQuotaMb / 1024)} GB` : '10 GB'),
    supportSla: p.supportSla || p.supportLevel || '24h Support Response',
    supportLevel: p.supportLevel || p.supportSla || 'Community Support',
    customDomain: Boolean(p.customDomain),
    sso: Boolean(p.sso),
    advancedAnalytics: Boolean(p.advancedAnalytics),
    prioritySupport: Boolean(p.prioritySupport),
    status: p.status || 'ACTIVE',
    tenantId: p.tenantId || null,
    features,
    limits: {
      maxMessages: p.maxMessages || 2000,
      maxBots: p.maxBots || 1,
      maxUsers: typeof maxUsers === 'number' ? maxUsers : 5,
      maxContacts: p.maxContacts || 500,
      maxCampaigns: p.maxCampaigns || 5,
      apiQuota: p.apiQuota || 10000,
      storageQuotaMb: p.storageQuotaMb || 2048,
      supportLevel: p.supportLevel || 'Community Support',
    },
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postgres: PostgresService,
  ) {}

  /**
   * Fetches plans from PostgreSQL with tenant isolation.
   * If user is a Reseller Admin, returns plans belonging to their tenant (or defaults if none created yet).
   * If user is an End Client under a Reseller, returns active plans configured by their Reseller.
   * If user is Super Admin, returns all active/configurable plans.
   * Otherwise, returns active platform plans.
   */
  async getPlans(user?: any) {
    try {
      const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'owner';
      const tenantId = user?.tenantId;

      let result;
      if (isSuperAdmin) {
        result = await this.postgres.query(
          `SELECT * FROM plans WHERE status != 'DELETED' ORDER BY "monthlyPrice" ASC;`
        );
      } else if (user?.role === 'RESELLER_ADMIN' && tenantId) {
        result = await this.postgres.query(
          `SELECT * FROM plans WHERE "tenantId" = $1 AND status != 'DELETED' ORDER BY "monthlyPrice" ASC;`,
          [tenantId]
        );

        // Fallback to platform plans if reseller has not created custom plans yet
        if (result.rows.length === 0) {
          result = await this.postgres.query(
            `SELECT * FROM plans WHERE "tenantId" IS NULL AND status = 'ACTIVE' ORDER BY "monthlyPrice" ASC;`
          );
        }
      } else if (tenantId && tenantId !== 'root' && tenantId !== 'APPNIX_DIRECT') {
        const tenantRes = await this.postgres.query(
          `SELECT id, "parentId", tier FROM tenants WHERE id = $1 LIMIT 1;`,
          [tenantId]
        );
        const tenant = tenantRes.rows[0];
        const effectiveResellerId = tenant?.parentId && tenant.tier === 'END_CLIENT' ? tenant.parentId : null;

        if (effectiveResellerId) {
          result = await this.postgres.query(
            `SELECT * FROM plans WHERE "tenantId" = $1 AND status = 'ACTIVE' ORDER BY "monthlyPrice" ASC;`,
            [effectiveResellerId]
          );
        }

        if (!result || result.rows.length === 0) {
          result = await this.postgres.query(
            `SELECT * FROM plans WHERE "tenantId" IS NULL AND status = 'ACTIVE' ORDER BY "monthlyPrice" ASC;`
          );
        }
      } else {
        result = await this.postgres.query(
          `SELECT * FROM plans WHERE "tenantId" IS NULL AND status = 'ACTIVE' ORDER BY "monthlyPrice" ASC;`
        );
      }

      if (result.rows && result.rows.length > 0) {
        return {
          success: true,
          data: result.rows.map(formatPlanRow),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Failed to query database plans table: ${err.message}. Using fallback.`);
    }

    try {
      const fallbackResult = await this.postgres.query(
        `SELECT * FROM plans WHERE "tenantId" IS NULL AND status = 'ACTIVE' ORDER BY "monthlyPrice" ASC;`
      );
      if (fallbackResult.rows && fallbackResult.rows.length > 0) {
        return {
          success: true,
          data: fallbackResult.rows.map(formatPlanRow),
        };
      }
    } catch {}

    return {
      success: true,
      data: [],
    };
  }

  /**
   * Creates a new plan in PostgreSQL scoped to the authenticated reseller tenant.
   * Parameterized direct PostgreSQL query — no Prisma.
   */
  async createResellerPlan(user: AuthUser, dto: CreatePlanDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Plan name is required');
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const tenantId = isSuperAdmin ? (dto as any).tenantId || null : user.tenantId;

    if (!tenantId && !isSuperAdmin) {
      throw new ForbiddenException('Tenant context missing from authentication session');
    }

    const id = dto.id && dto.id.trim() && !dto.id.startsWith('mock-') && dto.id !== 'new' && dto.id !== 'plan_new'
      ? dto.id.trim()
      : `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const baseSlug = (dto.slug || dto.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${id.slice(-6)}`;

    const monthlyPrice = Number(dto.monthlyPrice) || 0;
    const yearlyPrice = Number(dto.yearlyPrice) || (monthlyPrice * 10);
    const maxUsers = dto.userLimit === 'Unlimited' ? 999999 : (Number(dto.userLimit) || 5);
    const featuresJson = JSON.stringify(dto.features || []);

    const sql = `
      INSERT INTO plans (
        "id", "tenantId", "name", "slug", "description", "price", "monthlyPrice", "yearlyPrice",
        "currency", "billingCycle", "maxUsers", "apiLimit", "storageLimit", "supportSla", "supportLevel",
        "customDomain", "sso", "advancedAnalytics", "prioritySupport", "isPopular", "status", "features",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22,
        NOW(), NOW()
      )
      RETURNING *;
    `;

    const params = [
      id,
      tenantId,
      dto.name.trim(),
      slug,
      dto.description || `${dto.name.trim()} tier with dedicated workspace limits.`,
      monthlyPrice,
      monthlyPrice,
      yearlyPrice,
      dto.currency || 'INR',
      'monthly',
      maxUsers,
      dto.apiLimit || '100,000 req/mo',
      dto.storageLimit || '10 GB',
      dto.supportSla || '24h Support Response',
      dto.supportSla || 'Standard',
      Boolean(dto.customDomain),
      Boolean(dto.sso),
      Boolean(dto.advancedAnalytics),
      Boolean(dto.prioritySupport),
      Boolean(dto.isPopular),
      'ACTIVE',
      featuresJson,
    ];

    const { rows } = await this.postgres.query(sql, params);
    return formatPlanRow(rows[0]);
  }

  /**
   * Updates an existing plan in PostgreSQL after verifying tenant ownership.
   */
  async updateResellerPlan(user: AuthUser, id: string, dto: UpdatePlanDto) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Verify tenant ownership with parameterized query (check both id and slug)
    const checkSql = isSuperAdmin
      ? `SELECT * FROM plans WHERE (id = $1 OR slug = $1) AND status != 'DELETED';`
      : `SELECT * FROM plans WHERE (id = $1 OR slug = $1) AND "tenantId" = $2 AND status != 'DELETED';`;
    const checkParams = isSuperAdmin ? [id] : [id, user.tenantId];
    const existing = await this.postgres.query(checkSql, checkParams);

    if (existing.rows.length === 0) {
      // If plan not found in reseller scope, but full plan configuration is provided, auto-provision/upsert
      if (dto.name && dto.name.trim()) {
        const upsertId = id && id !== 'new' && !id.startsWith('mock-') ? id : dto.id;
        return this.createResellerPlan(user, {
          ...dto,
          id: upsertId,
          name: dto.name,
        } as CreatePlanDto);
      }
      throw new NotFoundException('Plan not found or you do not have permission to modify this plan');
    }

    const current = existing.rows[0];
    const targetId = current.id;
    const name = dto.name !== undefined ? dto.name.trim() : current.name;
    const description = dto.description !== undefined ? dto.description : current.description;
    const monthlyPrice = dto.monthlyPrice !== undefined ? Number(dto.monthlyPrice) : Number(current.monthlyPrice);
    const yearlyPrice = dto.yearlyPrice !== undefined ? Number(dto.yearlyPrice) : Number(current.yearlyPrice);
    const maxUsers = dto.userLimit !== undefined
      ? (dto.userLimit === 'Unlimited' ? 999999 : Number(dto.userLimit))
      : current.maxUsers;
    const apiLimit = dto.apiLimit !== undefined ? dto.apiLimit : current.apiLimit;
    const storageLimit = dto.storageLimit !== undefined ? dto.storageLimit : current.storageLimit;
    const supportSla = dto.supportSla !== undefined ? dto.supportSla : current.supportSla;
    const customDomain = dto.customDomain !== undefined ? Boolean(dto.customDomain) : current.customDomain;
    const sso = dto.sso !== undefined ? Boolean(dto.sso) : current.sso;
    const advancedAnalytics = dto.advancedAnalytics !== undefined ? Boolean(dto.advancedAnalytics) : current.advancedAnalytics;
    const prioritySupport = dto.prioritySupport !== undefined ? Boolean(dto.prioritySupport) : current.prioritySupport;
    const isPopular = dto.isPopular !== undefined ? Boolean(dto.isPopular) : current.isPopular;
    const status = dto.status !== undefined ? dto.status : current.status;
    const currency = dto.currency !== undefined ? dto.currency : (current.currency || 'INR');
    const featuresJson = dto.features !== undefined
      ? JSON.stringify(dto.features)
      : (typeof current.features === 'string' ? current.features : JSON.stringify(current.features ?? []));

    const sql = `
      UPDATE plans SET
        "name" = $1,
        "description" = $2,
        "price" = $3,
        "monthlyPrice" = $4,
        "yearlyPrice" = $5,
        "maxUsers" = $6,
        "teamSeats" = $6,
        "apiLimit" = $7,
        "storageLimit" = $8,
        "supportSla" = $9,
        "supportLevel" = $10,
        "customDomain" = $11,
        "sso" = $12,
        "advancedAnalytics" = $13,
        "prioritySupport" = $14,
        "isPopular" = $15,
        "status" = $16,
        "features" = $17::jsonb,
        "currency" = $18,
        "updatedAt" = NOW()
      WHERE id = $19
      RETURNING *;
    `;

    const params = [
      name,
      description,
      monthlyPrice,
      monthlyPrice,
      yearlyPrice,
      maxUsers,
      apiLimit,
      storageLimit,
      supportSla,
      supportSla,
      customDomain,
      sso,
      advancedAnalytics,
      prioritySupport,
      isPopular,
      status,
      featuresJson,
      currency,
      targetId,
    ];

    const { rows } = await this.postgres.query(sql, params);
    return formatPlanRow(rows[0]);
  }

  /**
   * Deletes or safely archives a plan in PostgreSQL after checking foreign key references.
   */
  async deleteResellerPlan(user: AuthUser, id: string) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Verify tenant ownership with parameterized query
    const checkSql = isSuperAdmin
      ? `SELECT * FROM plans WHERE id = $1 AND status != 'DELETED';`
      : `SELECT * FROM plans WHERE id = $1 AND "tenantId" = $2 AND status != 'DELETED';`;
    const checkParams = isSuperAdmin ? [id] : [id, user.tenantId];
    const existing = await this.postgres.query(checkSql, checkParams);

    if (existing.rows.length === 0) {
      throw new NotFoundException('Plan not found or you do not have permission to delete this plan');
    }

    // Inspect references to protect historical records
    const refCheck = await this.postgres.query(
      `SELECT 
         (SELECT COUNT(*) FROM subscriptions WHERE "planRefId" = $1 OR "planId" = $1) AS sub_count,
         (SELECT COUNT(*) FROM payment_orders WHERE "planId" = $1) AS order_count;`,
      [id]
    );

    const subCount = Number(refCheck.rows[0]?.sub_count || 0);
    const orderCount = Number(refCheck.rows[0]?.order_count || 0);

    if (subCount > 0 || orderCount > 0) {
      // Historical references exist - archive rather than breaking foreign keys
      await this.postgres.query(
        `UPDATE plans SET status = 'ARCHIVED', "updatedAt" = NOW() WHERE id = $1;`,
        [id]
      );
      return { success: true, archived: true, message: 'Plan has active subscriptions or payment history and was safely archived.' };
    }

    // Mark DELETED
    await this.postgres.query(`UPDATE plans SET status = 'DELETED', "updatedAt" = NOW() WHERE id = $1;`, [id]);
    return { success: true, archived: false, message: 'Plan removed successfully.' };
  }

  /**
   * Retrieves active subscription for the given workspace/tenant from PostgreSQL directly.
   * Parameterized queries — no Prisma.
   * If the workspace has no subscription, or is expired/cancelled/suspended, hasActiveSubscription is false.
   */
  async getSubscription(tenantId: string) {
    if (!tenantId || tenantId === 'default' || tenantId === 'tenant_default') {
      return {
        success: true,
        hasActiveSubscription: false,
        data: null,
        message: 'No active subscription found. Valid workspace context required.',
      };
    }

    const queryTenantId = tenantId;

    const tenantRes = await this.postgres.query(
      `SELECT id, status FROM tenants WHERE id = $1 LIMIT 1;`,
      [queryTenantId]
    ).catch(() => ({ rows: [] }));
    const tenant = tenantRes.rows[0];

    if (tenant && tenant.status === 'SUSPENDED') {
      return {
        success: true,
        hasActiveSubscription: false,
        isSuspended: true,
        data: null,
        message: 'Workspace has been suspended. Please select a plan or contact support to restore access.',
      };
    }

    if (tenant && tenant.status === 'CANCELLED') {
      return {
        success: true,
        hasActiveSubscription: false,
        isCancelled: true,
        data: null,
        message: 'Workspace subscription has been cancelled. Please select a plan to reactivate.',
      };
    }

    const subRes = await this.postgres.query(
      `SELECT * FROM subscriptions WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1;`,
      [queryTenantId]
    ).catch(() => ({ rows: [] }));
    const sub = subRes.rows[0];

    // 1. Unsubscribed / Brand New User
    if (!sub) {
      return {
        success: true,
        hasActiveSubscription: false,
        data: null,
        message: 'No active subscription found for this workspace. Please select a plan.',
      };
    }

    // 2. Cancelled Subscription Check
    if (sub.status === 'CANCELLED') {
      return {
        success: true,
        hasActiveSubscription: false,
        isCancelled: true,
        data: {
          id: sub.id,
          planId: sub.planId,
          planName: sub.planName,
          status: 'CANCELLED',
          currentPeriodEnd: sub.currentPeriodEnd,
        },
        message: 'Your subscription has been cancelled. Please choose a plan to reactivate.',
      };
    }

    // 3. Suspended Subscription Check
    if (sub.status === 'SUSPENDED') {
      return {
        success: true,
        hasActiveSubscription: false,
        isSuspended: true,
        data: {
          id: sub.id,
          planId: sub.planId,
          planName: sub.planName,
          status: 'SUSPENDED',
          currentPeriodEnd: sub.currentPeriodEnd,
        },
        message: 'Your subscription is currently suspended. Please select a plan to restore access.',
      };
    }

    const now = new Date();
    // 4. Expired Subscription Check
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    if (sub.status === 'PAST_DUE' || sub.status === 'EXPIRED' || (periodEnd && periodEnd < now)) {
      await this.postgres.query(
        `UPDATE subscriptions SET status = 'PAST_DUE', "updatedAt" = NOW() WHERE id = $1;`,
        [sub.id]
      ).catch(() => {});

      return {
        success: true,
        hasActiveSubscription: false,
        isExpired: true,
        data: {
          id: sub.id,
          planId: sub.planId,
          planName: sub.planName,
          status: 'EXPIRED',
          isTrial: Boolean(sub.isTrial || sub.status === 'TRIALING'),
          currentPeriodEnd: sub.currentPeriodEnd,
        },
        message:
          sub.status === 'TRIALING' || sub.isTrial
            ? 'Your 7-day free trial has expired. Please select a plan to continue.'
            : 'Your subscription has expired. Please choose a plan to renew.',
      };
    }

    // 5. Inactive status check
    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
      return {
        success: true,
        hasActiveSubscription: false,
        data: {
          id: sub.id,
          planId: sub.planId,
          planName: sub.planName,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
        },
        message: 'No active subscription found for this workspace. Please select a plan.',
      };
    }

    // 6. Active or Trialing Subscription
    const countRes = await this.postgres.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM bots WHERE "tenantId" = $1) AS used_bots,
        (SELECT COUNT(*)::int FROM users WHERE "tenantId" = $1) AS used_team_seats,
        (SELECT COUNT(*)::int FROM channel_transactions WHERE "tenantId" = $1) AS used_messages;
    `, [tenantId]).catch(() => ({ rows: [{ used_bots: 0, used_team_seats: 1, used_messages: 0 }] }));

    const usedBots = Number(countRes.rows[0]?.used_bots || 0);
    const usedTeamSeats = Math.max(1, Number(countRes.rows[0]?.used_team_seats || 1));
    const usedMessages = Number(countRes.rows[0]?.used_messages || 0);

    const isTrial = sub.status === 'TRIALING' || Boolean(sub.isTrial);
    const totalDays = sub.totalDays || (isTrial ? 7 : 30);
    const remainingDays = periodEnd
      ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const formattedNextBillingDate = periodEnd
      ? periodEnd.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A';

    return {
      success: true,
      hasActiveSubscription: true,
      data: {
        id: sub.id,
        planId: sub.planId,
        planName: sub.planName,
        price: sub.price,
        status: sub.status,
        isTrial,
        totalDays,
        remainingDays,
        usedDays: Math.max(0, totalDays - remainingDays),
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        maxMessages: sub.maxMessages,
        usedMessages,
        maxBots: sub.maxBots,
        usedBots,
        maxTeamSeats: sub.maxTeamSeats,
        usedTeamSeats,
        nextBillingDate: formattedNextBillingDate,
        paymentMethod: sub.paymentProvider || (isTrial ? 'Free Trial' : 'Cashfree UPI / NetBanking'),
      },
    };
  }

  /**
   * Checks whether the current workspace is eligible for a 7-day free trial based on
   * their parent partner configuration (strictly controlled by Super Admin).
   */
  async getTrialEligibility(tenantId: string) {
    if (!tenantId || tenantId === 'default' || tenantId === 'tenant_default') {
      return {
        eligible: false,
        trialEnabled: false,
        reason: 'Valid workspace context required.',
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        parent: {
          include: { partnerConfig: true },
        },
        partnerConfig: true,
      },
    });

    if (!tenant) {
      return {
        eligible: false,
        trialEnabled: false,
        reason: 'Workspace organization not found.',
      };
    }

    // Determine partner configuration:
    // If tenant is an END_CLIENT, check parent partner's partnerConfig.
    // If tenant is a RESELLER itself, check own partnerConfig or parent.
    const partnerConfig =
      tenant.tier === 'END_CLIENT'
        ? tenant.parent?.partnerConfig
        : tenant.partnerConfig || tenant.parent?.partnerConfig;

    if (!partnerConfig || !partnerConfig.trialEnabled) {
      return {
        eligible: false,
        trialEnabled: false,
        reason: '7-Day Free Trial is disabled by your partner administrator. Please select a subscription plan.',
      };
    }

    // Check if workspace has already redeemed a trial
    if (tenant.trialUsed) {
      return {
        eligible: false,
        trialEnabled: true,
        alreadyUsed: true,
        trialDays: partnerConfig.trialDays || 7,
        trialMaxUsers: partnerConfig.trialMaxUsers || 5,
        reason: 'Free trial has already been redeemed for this workspace.',
      };
    }

    const existingTrialOrActive = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        OR: [
          { status: 'TRIALING' },
          { isTrial: true },
          { status: 'ACTIVE' },
        ],
      },
    });

    if (existingTrialOrActive) {
      return {
        eligible: false,
        trialEnabled: true,
        alreadyUsed: true,
        trialDays: partnerConfig.trialDays || 7,
        trialMaxUsers: partnerConfig.trialMaxUsers || 5,
        reason:
          existingTrialOrActive.status === 'ACTIVE'
            ? 'Workspace already has an active subscription.'
            : 'Free trial has already been redeemed for this workspace.',
      };
    }

    return {
      eligible: true,
      trialEnabled: true,
      alreadyUsed: false,
      trialDays: partnerConfig.trialDays || 7,
      trialMaxUsers: partnerConfig.trialMaxUsers || 5,
      partnerName: tenant.parent?.name || tenant.name,
    };
  }

  /**
   * Starts a 7-day free trial for a workspace if the partner explicitly allows it
   * and the workspace has not previously redeemed a trial.
   */
  async startTrial(tenantId: string, planId?: string) {
    if (!tenantId || tenantId === 'default' || tenantId === 'tenant_default') {
      throw new BadRequestException('Valid workspace context is required.');
    }

    const eligibility = await this.getTrialEligibility(tenantId);
    if (!eligibility.trialEnabled) {
      throw new ForbiddenException(
        'The 7-Day Free Trial is not enabled for your organization. Please select a paid subscription plan.',
      );
    }
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason || 'Workspace is not eligible for a free trial.');
    }

    const trialDays = 7; // Fixed at 7 days
    const trialMaxUsers = eligibility.trialMaxUsers || 5;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const currentUserCount = await this.prisma.user.count({ where: { tenantId } });

    const sub = await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          trialUsed: true,
          maxUsers: trialMaxUsers,
        },
      });

      return tx.subscription.create({
        data: {
          tenantId,
          planId: planId || 'pro',
          planName: '7-Day Free Trial',
          price: `₹0 (Trial - ${trialDays} Days)`,
          status: 'TRIALING',
          isTrial: true,
          totalDays: trialDays,
          remainingDays: trialDays,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          maxMessages: 10000,
          usedMessages: 0,
          maxBots: 2,
          usedBots: 0,
          maxTeamSeats: trialMaxUsers,
          usedTeamSeats: Math.max(1, currentUserCount),
        },
      });
    });

    this.logger.log(
      `🎉 Activated 7-day free trial for tenant "${tenantId}" (max seats: ${trialMaxUsers}, expires: ${trialEnd.toISOString()})`,
    );

    return {
      success: true,
      hasActiveSubscription: true,
      data: {
        id: sub.id,
        planId: sub.planId,
        planName: sub.planName,
        price: sub.price,
        status: sub.status,
        isTrial: true,
        totalDays: trialDays,
        remainingDays: trialDays,
        maxTeamSeats: trialMaxUsers,
        usedTeamSeats: sub.usedTeamSeats,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      message: `Your 7-Day Free Trial with ${trialMaxUsers} user seats has been activated!`,
    };
  }

  /**
   * Idempotently activates or upgrades a workspace subscription after verified server-side payment.
   * Parameterized PostgreSQL queries — direct database layer.
   */
  async activateSubscriptionFromPayment(params: {
    tenantId: string;
    orderId: string;
    paymentId: string;
    planId: string;
    billingCycle?: 'monthly' | 'yearly';
    amount: number;
    paymentMethod?: string;
  }) {
    const {
      tenantId,
      orderId,
      paymentId,
      planId,
      billingCycle = 'monthly',
      amount,
      paymentMethod = 'Cashfree UPI / NetBanking',
    } = params;

    const effectiveTenantId = tenantId;
    if (!effectiveTenantId || effectiveTenantId === 'default' || effectiveTenantId === 'tenant_default') {
      throw new BadRequestException('A valid tenantId is required to activate subscription.');
    }

    if (!orderId) {
      throw new BadRequestException('orderId is required to activate subscription.');
    }

    // 1. Idempotency check: verify if this order was already processed
    const existingInvoice = await this.postgres.query(
      `SELECT id FROM invoices WHERE "tenantId" = $1 AND "invoiceNumber" = $2 LIMIT 1;`,
      [effectiveTenantId, orderId]
    );

    if (existingInvoice.rows.length > 0) {
      const currentSub = await this.postgres.query(
        `SELECT * FROM subscriptions WHERE "tenantId" = $1 AND status = 'ACTIVE' ORDER BY "createdAt" DESC LIMIT 1;`,
        [effectiveTenantId]
      );
      return {
        success: true,
        alreadyProcessed: true,
        subscription: currentSub.rows[0],
        message: 'Order already processed.',
      };
    }

    // 2. Fetch Plan limits and details from PostgreSQL plans table
    const planRows = await this.postgres.query(
      `SELECT * FROM plans WHERE slug = $1 OR id = $1 LIMIT 1;`,
      [planId]
    );
    const plan = planRows.rows[0];

    const planName =
      plan?.name ||
      (planId === 'enterprise'
        ? 'Enterprise Custom'
        : planId === 'pro'
        ? 'Professional Tier'
        : 'Starter Tier');

    const maxMsgs =
      plan?.maxMessages ||
      (planId === 'enterprise' ? 250000 : planId === 'pro' ? 25000 : 2000);
    const maxBots =
      plan?.maxBots ||
      (planId === 'enterprise' ? 50 : planId === 'pro' ? 5 : 1);
    const maxSeats =
      plan?.maxUsers ||
      (planId === 'enterprise' ? 50 : planId === 'pro' ? 10 : 2);

    let daysToAdd = 30;
    let cycleSuffix = '/mo';
    const cycle = (billingCycle || 'monthly').toLowerCase();

    if (cycle === 'yearly' || cycle === 'annual' || cycle === '12_months') {
      daysToAdd = 365;
      cycleSuffix = '/yr';
    } else if (cycle === 'half_yearly' || cycle === '6_months' || cycle === 'semi_annual') {
      daysToAdd = 180;
      cycleSuffix = '/6mo';
    } else if (cycle === 'quarterly' || cycle === '3_months') {
      daysToAdd = 90;
      cycleSuffix = '/3mo';
    } else {
      daysToAdd = 30;
      cycleSuffix = '/mo';
    }

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(now.getDate() + daysToAdd);

    // 3. Mark any previous active/trialing subscriptions as CANCELLED
    await this.postgres.query(
      `UPDATE subscriptions SET status = 'CANCELLED', "updatedAt" = NOW() WHERE "tenantId" = $1 AND status IN ('ACTIVE', 'TRIALING');`,
      [effectiveTenantId]
    );

    // 4. Create new verified ACTIVE subscription in subscriptions table
    const newSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSubRes = await this.postgres.query(`
      INSERT INTO subscriptions (
        id, "tenantId", "planId", "planRefId", "planName", price, status,
        "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
        "maxMessages", "usedMessages", "maxBots", "usedBots", "maxTeamSeats", "usedTeamSeats",
        "stripeSubscriptionId", "stripeCustomerId", "isTrial", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'ACTIVE',
        $7, $8, $9, $10,
        $11, 0, $12, 0, $13, 1,
        $14, $15, false, NOW(), NOW()
      ) RETURNING *;
    `, [
      newSubId,
      effectiveTenantId,
      plan?.slug || planId,
      plan?.id || null,
      planName,
      `₹${amount.toLocaleString('en-IN')}${cycleSuffix}`,
      daysToAdd,
      daysToAdd,
      now,
      periodEnd,
      maxMsgs,
      maxBots,
      maxSeats,
      orderId,
      paymentId || 'CASHFREE',
    ]);

    // 5. Create Official Tax Invoice
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await this.postgres.query(`
      INSERT INTO invoices (
        id, "tenantId", "invoiceNumber", date, plan, amount, status, "createdAt"
      ) VALUES (
        $1, $2, $3, NOW(), $4, $5, 'Paid', NOW()
      );
    `, [
      invoiceId,
      effectiveTenantId,
      orderId,
      `${planName} (${cycle.toUpperCase()})`,
      `₹${amount.toLocaleString('en-IN')}`
    ]);

    // 6. Update payment_orders status if orderId exists
    await this.postgres.query(
      `UPDATE payment_orders SET status = 'SUCCESS', "cfPaymentId" = $1, "paymentMethod" = $2, "updatedAt" = NOW() WHERE "orderId" = $3;`,
      [paymentId || 'CASHFREE', paymentMethod, orderId]
    ).catch(() => {});

    return {
      success: true,
      alreadyProcessed: false,
      subscription: newSubRes.rows[0],
      message: `Successfully activated ${planName} for workspace.`,
    };
  }

  /**
   * Super Admin manual subscription assignment.
   * Parameterized PostgreSQL queries.
   */
  async assignSubscriptionManually(tenantId: string, planId: string, days: number = 30) {
    const planRows = await this.postgres.query(
      `SELECT * FROM plans WHERE slug = $1 OR id = $1 LIMIT 1;`,
      [planId]
    );
    const plan = planRows.rows[0];

    const planName = plan?.name || (planId === 'enterprise' ? 'Enterprise' : planId === 'pro' ? 'Professional Tier' : 'Starter');
    const maxMsgs = plan?.maxMessages || (planId === 'enterprise' ? 250000 : planId === 'pro' ? 25000 : 2000);
    const maxBots = plan?.maxBots || (planId === 'enterprise' ? 50 : planId === 'pro' ? 5 : 1);
    const maxSeats = plan?.maxUsers || (planId === 'enterprise' ? 50 : planId === 'pro' ? 10 : 2);

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(now.getDate() + days);

    await this.postgres.query(
      `UPDATE subscriptions SET status = 'CANCELLED', "updatedAt" = NOW() WHERE "tenantId" = $1 AND status IN ('ACTIVE', 'TRIALING');`,
      [tenantId]
    );

    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const subRes = await this.postgres.query(`
      INSERT INTO subscriptions (
        id, "tenantId", "planId", "planRefId", "planName", price, status,
        "totalDays", "remainingDays", "currentPeriodStart", "currentPeriodEnd",
        "maxMessages", "usedMessages", "maxBots", "usedBots", "maxTeamSeats", "usedTeamSeats",
        "stripeCustomerId", "isTrial", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'ACTIVE',
        $7, $8, $9, $10,
        $11, 0, $12, 0, $13, 1,
        'SUPER_ADMIN_MANUAL', false, NOW(), NOW()
      ) RETURNING *;
    `, [
      subId,
      tenantId,
      plan?.slug || planId,
      plan?.id || null,
      planName,
      `₹${(Number(plan?.monthlyPrice) || 2999).toLocaleString('en-IN')}/mo (Admin Assigned)`,
      days,
      days,
      now,
      periodEnd,
      maxMsgs,
      maxBots,
      maxSeats,
    ]);

    return {
      success: true,
      data: subRes.rows[0],
      message: `Super Admin successfully assigned ${planName} (${days} days) to tenant.`,
    };
  }

  async getInvoices(tenantId: string) {
    const res = await this.postgres.query(
      `SELECT * FROM invoices WHERE "tenantId" = $1 ORDER BY date DESC;`,
      [tenantId]
    );

    return {
      success: true,
      data: res.rows.map((inv: any) => ({
        id: inv.invoiceNumber,
        invoiceNumber: inv.invoiceNumber,
        date: new Date(inv.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        plan: inv.plan,
        amount: inv.amount,
        status: inv.status,
        downloadUrl: inv.downloadUrl || '#',
      })),
    };
  }

  async cancelSubscription(tenantId: string) {
    await this.postgres.query(
      `UPDATE subscriptions SET status = 'CANCELLED', "updatedAt" = NOW() WHERE "tenantId" = $1 AND status = 'ACTIVE';`,
      [tenantId]
    );

    return {
      success: true,
      message: 'Subscription has been cancelled.',
    };
  }
}
