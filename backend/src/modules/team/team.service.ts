import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/team.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        phone: true,
        departmentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: users,
    };
  }

  async inviteMember(tenantId: string, dto: InviteMemberDto) {
    // 1. Enforce Workspace User Seat Limit (Server-Side)
    const [currentUserCount, subscription, tenant] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { maxUsers: true },
      }),
    ]);

    const maxAllowedSeats = subscription?.maxTeamSeats || tenant?.maxUsers || 5;

    if (currentUserCount >= maxAllowedSeats) {
      if (subscription?.status === 'TRIALING' || subscription?.isTrial) {
        throw new BadRequestException(
          `Trial user limit of ${maxAllowedSeats} seats reached (${currentUserCount} of ${maxAllowedSeats} used). Upgrade to a paid subscription plan to invite more team members.`,
        );
      }
      throw new BadRequestException(
        `Workspace seat limit of ${maxAllowedSeats} users reached (${currentUserCount} of ${maxAllowedSeats} used). Upgrade your subscription plan to add more team members.`,
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const defaultPassword = 'TempPassword@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role || 'MEMBER',
        departmentId: dto.departmentId,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    });

    // Update usedTeamSeats on subscription
    if (subscription) {
      await this.prisma.subscription
        .update({
          where: { id: subscription.id },
          data: { usedTeamSeats: currentUserCount + 1 },
        })
        .catch(() => {});
    }

    return {
      success: true,
      data: user,
      message: `Invitation dispatched to ${dto.email}`,
    };
  }

  async updateMemberRole(tenantId: string, userId: string, dto: UpdateMemberRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Member not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Role updated successfully',
    };
  }

  async removeMember(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Member not found');

    await this.prisma.user.delete({ where: { id: userId } });

    // Update remaining seats count on subscription
    const [remainingUsers, subscription] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (subscription) {
      await this.prisma.subscription
        .update({
          where: { id: subscription.id },
          data: { usedTeamSeats: Math.max(1, remainingUsers) },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: 'Member removed from workspace',
    };
  }
}
