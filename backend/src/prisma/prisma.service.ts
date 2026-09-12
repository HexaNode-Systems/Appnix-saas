import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { TenantContextStore } from '../lib/auth/tenant-context.store';
import { TENANT_SCOPED_MODELS, tenantFieldForModel } from './tenant-scope';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenantContextStore: TenantContextStore) {
    super();
    this.$use(async (params, next) => {
      const context = this.tenantContextStore.get();
      const model = params.model ? params.model.charAt(0).toLowerCase() + params.model.slice(1) : '';
      if (!context || !TENANT_SCOPED_MODELS.has(model)) return next(params);

      // Super Admin and Direct App Admin without active impersonation operate platform-wide
      const isPlatformOperator =
        (context.role === 'SUPER_ADMIN' ||
          context.role === 'APP_ADMIN' ||
          context.domainContext === 'SUPER_ADMIN' ||
          context.domainContext === 'DIRECT_ADMIN') &&
        !context.impersonatedWorkspaceId;

      if (isPlatformOperator) {
        return next(params);
      }

      params.args ??= {};
      const args = params.args as { where?: Record<string, unknown>; data?: Record<string, unknown>; create?: Record<string, unknown> };
      const tenantField = tenantFieldForModel(model);
      const scopedWhere = { ...(args.where || {}), [tenantField]: context.tenantId };

      if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(params.action)) {
        args.where = scopedWhere;
      } else if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
        // `findUnique` cannot include non-unique tenantId. Converting it makes
        // single ID reads non-enumerable across tenants.
        params.action = params.action === 'findUniqueOrThrow' ? 'findFirstOrThrow' : 'findFirst';
        args.where = scopedWhere;
      } else if (params.action === 'create') {
        args.data = { ...(args.data || {}), [tenantField]: context.tenantId };
      } else if (params.action === 'update' || params.action === 'delete') {
        // Prisma's update/delete selector is unique-only. Verify ownership via
        // a tenant-scoped read before retaining the existing result shape.
        const delegate = (this as unknown as Record<string, { findFirst: Function }>)[model];
        const owned = await delegate.findFirst({ where: args.where || {} });
        if (!owned) throw new NotFoundException('Resource not found');
      } else if (params.action === 'upsert') {
        const delegate = (this as unknown as Record<string, { findFirst: Function }>)[model];
        const existing = await delegate.findFirst({ where: args.where || {} });
        if (existing) {
          // The pending upsert can only update a record already proven owned.
        } else {
          args.create = { ...(args.create || {}), [tenantField]: context.tenantId };
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully.');
        break;
      } catch (err: any) {
        retries -= 1;
        this.logger.warn(`Prisma connection attempt failed (${err?.message || err}). Retries remaining: ${retries}`);
        if (retries === 0) {
          this.logger.error('Could not connect to database after multiple attempts.', err);
          throw err;
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
