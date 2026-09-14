import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Super Admin and Reseller Admin inspection bypass
    if (
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'owner' ||
      user?.role === 'RESELLER_ADMIN' ||
      user?.impersonatedWorkspaceId ||
      user?.isImpersonated ||
      request.headers?.['x-impersonation-token']
    ) {
      return true;
    }

    const tenantId = user?.tenantId || request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'TENANT_REQUIRED',
        message: 'Tenant context is required to access CRM resources.',
      });
    }

    // 2. Query active or trialing subscription for this specific tenant (strict isolation)
    const tenant = await this.prisma.tenant
      .findUnique({
        where: { id: String(tenantId) },
        select: { status: true },
      })
      .catch(() => null);

    if (tenant?.status === 'SUSPENDED' || tenant?.status === 'CANCELLED') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Subscription Required',
        code: 'TENANT_INACTIVE',
        message: 'Workspace is suspended or cancelled. Please select an active plan to continue.',
      });
    }

    const now = new Date();
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: String(tenantId),
        status: { in: ['ACTIVE', 'TRIALING'] },
        OR: [
          { currentPeriodEnd: { gt: now } },
          { remainingDays: { gt: 0 } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Subscription Required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to access CRM features. Please choose a plan to continue.',
      });
    }

    // Attach active subscription to the request context
    request.subscription = sub;
    return true;
  }
}
