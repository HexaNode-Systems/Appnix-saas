import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, TenantTier } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: clean,
          mode: 'insensitive',
        },
      },
      include: { tenant: true },
    });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: { tenant: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { tenant: true },
    });
  }

  findUsersWithActiveResetTokens() {
    return this.prisma.user.findMany({
      where: {
        passwordResetToken: { not: null },
        passwordResetExpiry: { gte: new Date() },
      },
      include: { tenant: true },
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findOneInTenant(id: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId },
    });
  }

  // creates the tenant AND the first user together, atomically
  async createTenantWithAdmin(
    tenantName: string,
    email: string,
    passwordHash: string,
    name?: string,
    options?: {
      parentId?: string;
      tier?: TenantTier;
      role?: Role;
    },
  ) {
    const slug = this.generateSlug(tenantName);
    const tenantId = randomUUID();
    const cleanId = tenantId.replace(/-/g, '_');

    // transaction: if user creation fails, the tenant creation rolls back too
    return this.prisma.$transaction(
      async (tx) => {
        let path = `root.t_${cleanId}`;
        let depth = 1;
        const parentId = options?.parentId || null;
        let tier = options?.tier || TenantTier.END_CLIENT;

        if (parentId) {
          const parent = await tx.tenant.findUnique({ where: { id: parentId } });
          if (parent) {
            path = `${parent.path}.t_${cleanId}`;
            depth = parent.depth + 1;
            tier = options?.tier || TenantTier.END_CLIENT;
          }
        }

        const tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            name: tenantName,
            slug,
            path,
            depth,
            parentId,
            tier,
          },
        });

        const assignedRole =
          options?.role ||
          (tier === TenantTier.PRIMARY_RESELLER || tier === TenantTier.SUB_RESELLER
            ? Role.RESELLER_ADMIN
            : Role.CLIENT_USER);

        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: assignedRole,
            tenantId: tenant.id,
          },
        });

        return { tenant, user };
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  // creates the tenant AND OAuth admin user atomically
  async createOAuthTenantWithUser(data: {
    tenantName: string;
    email: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }) {
    const slug = this.generateSlug(data.tenantName);
    const tenantId = randomUUID();
    const cleanId = tenantId.replace(/-/g, '_');
    const path = `root.t_${cleanId}`;

    return this.prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            name: data.tenantName,
            slug,
            path,
            depth: 1,
            tier: TenantTier.PRIMARY_RESELLER,
          },
        });

        const user = await tx.user.create({
          data: {
            email: data.email,
            name: data.name,
            avatar: data.avatar,
            googleId: data.googleId,
            role: Role.TENANT_ADMIN,
            tenantId: tenant.id,
          },
        });

        return { tenant, user };
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  linkGoogleAccount(userId: string, googleId: string, avatar?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        ...(avatar ? { avatar } : {}),
      },
      include: { tenant: true },
    });
  }

  updateRefreshToken(userId: string, hashedRefreshToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  updatePasswordResetToken(
    userId: string,
    hashedToken: string,
    expiry: Date,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  clearPasswordResetToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
  }

  private generateSlug(name: string): string {
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suffix = Math.random().toString(36).substring(2, 7); // avoid slug collisions
    return `${base}-${suffix}`;
  }
}