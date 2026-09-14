import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { TenantContextStore } from './tenant-context.store';

export interface SessionContext {
  /** The authenticated human/operator. This never changes during impersonation. */
  userId?: string;
  email?: string;
  role?: Role;
  /** The tenant bound to the login session. */
  workspaceId?: string;
  /** The only tenant application queries may use for this request. */
  tenantId: string;
  impersonatedWorkspaceId?: string;
  /** Materialized hierarchical path (e.g. "root.t_123.t_456") for subtree isolation */
  orgPath?: string;
  /** Organization tier (PLATFORM_ROOT, PRIMARY_RESELLER, SUB_RESELLER, END_CLIENT) */
  tier?: string;
  /** Granted permissions array */
  permissions?: string[];
  partnerId?: string;
  isWhiteLabel?: boolean;
  isDirect?: boolean;
  domainContext?: 'MARKETING' | 'DIRECT_CLIENT' | 'DIRECT_ADMIN' | 'SUPER_ADMIN' | 'PARTNER_ADMIN' | 'CUSTOM_DOMAIN';
}

interface ImpersonationClaims {
  sub: string;
  role: Role;
  targetWorkspaceId: string;
  targetOrgPath?: string;
  targetTier?: string;
  purpose: 'super_admin_impersonation' | 'reseller_impersonation';
}

/**
 * Converts an already verified access-token principal into the sole server-side
 * tenant context. Client supplied workspace/tenant values are intentionally not
 * read here. A support tenant can only come from a separately signed short-lived
 * impersonation token.
 */
@Injectable()
export class SessionContextResolver {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenantContextStore: TenantContextStore,
  ) {}

  resolve(request: Request): SessionContext {
    const principal = request.user as
      | {
          userId?: string;
          email?: string;
          tenantId?: string;
          role?: Role;
          orgPath?: string;
          tier?: string;
          permissions?: string[];
        }
      | undefined;

    if (!principal?.userId || !principal.tenantId || !principal.role) {
      throw new UnauthorizedException('A verified authenticated session is required');
    }

    const existingStore = this.tenantContextStore.get();
    const context: SessionContext = {
      userId: principal.userId,
      email: principal.email || '',
      role: principal.role,
      workspaceId: principal.tenantId,
      tenantId: principal.tenantId,
      partnerId: existingStore?.partnerId,
      isWhiteLabel: existingStore?.isWhiteLabel,
      isDirect: existingStore?.isDirect,
      domainContext: existingStore?.domainContext,
      orgPath: principal.orgPath || 'root',
      tier: principal.tier || 'END_CLIENT',
      permissions: principal.permissions || ['*'],
    };

    const reqPath = request.path || request.originalUrl || request.url || '';
    const isImpersonationCreationEndpoint =
      reqPath.includes('guest-login') ||
      reqPath.includes('impersonate') ||
      reqPath.includes('/auth/');

    if (isImpersonationCreationEndpoint) {
      this.tenantContextStore.enter(context);
      return context;
    }

    const impersonationToken = request.header('x-impersonation-token');
    if (!impersonationToken) {
      this.tenantContextStore.enter(context);
      return context;
    }

    try {
      const claims = this.jwt.verify<ImpersonationClaims>(impersonationToken, {
        secret:
          this.config.get<string>('IMPERSONATION_JWT_SECRET') ||
          this.config.get<string>('JWT_ACCESS_SECRET') ||
          this.config.get<string>('JWT_SECRET'),
      });

      if (claims.sub !== context.userId) {
        // If the bearer token is a workspace token issued during guest-login,
        // verify that the impersonation token targets this exact workspace and was
        // signed by an authorized Super Admin or Reseller Admin.
        if (
          claims.targetWorkspaceId === context.tenantId &&
          (claims.role === Role.SUPER_ADMIN || claims.role === Role.RESELLER_ADMIN)
        ) {
          context.impersonatedWorkspaceId = claims.targetWorkspaceId;
          this.tenantContextStore.enter(context);
          return context;
        }
        if (context.role === Role.SUPER_ADMIN || (context.role as any) === 'owner') {
          this.tenantContextStore.enter(context);
          return context;
        }
        throw new Error('Impersonation token actor does not match active session');
      }

      if (context.role === Role.SUPER_ADMIN) {
        // Full platform inspection allowed
      } else if (context.role === Role.RESELLER_ADMIN) {
        if (claims.targetOrgPath && !claims.targetOrgPath.startsWith(context.orgPath + '.')) {
          throw new ForbiddenException('Cannot inspect workspace outside your reseller tree');
        }
      } else {
        throw new ForbiddenException('Only Super Admins and Reseller Admins may use delegated inspection');
      }

      context.impersonatedWorkspaceId = claims.targetWorkspaceId;
      context.tenantId = claims.targetWorkspaceId;
      if (claims.targetOrgPath) {
        context.orgPath = claims.targetOrgPath;
      }
      if (claims.targetTier) {
        context.tier = claims.targetTier;
      }
      this.tenantContextStore.enter(context);
      return context;
    } catch (e: any) {
      if (e instanceof ForbiddenException) throw e;
      if (context.role === Role.SUPER_ADMIN || (context.role as any) === 'owner') {
        this.tenantContextStore.enter(context);
        return context;
      }
      throw new ForbiddenException('Invalid or expired support impersonation context');
    }
  }
}
