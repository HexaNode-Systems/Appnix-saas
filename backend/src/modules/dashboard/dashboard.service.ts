import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    // 1. Gather live counts and records from database
    const [
      totalConversations,
      activeCampaignsCount,
      automationsRunning,
      contactsCount,
      subscription,
      recentCampaigns,
      recentActivity,
      teamMembersCount,
      bots,
      contactsHistory,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId } }),
      this.prisma.campaign.count({
        where: {
          tenantId,
          status: { in: ['LAUNCHING', 'RUNNING', 'READY_FOR_TEST'] },
        },
      }),
      this.prisma.workflow.count({
        where: { tenantId, status: true },
      }),
      this.prisma.crmContact.count({ where: { tenantId } }),
      this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.findMany({
        where: { tenantId },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.bot.findMany({ where: { tenantId } }),
      this.prisma.crmContact.findMany({
        where: { tenantId },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Calculate total bot interactions from real bot entities
    const totalBotInteractions = bots.reduce(
      (sum, b) => sum + (b.interactionsCount || 0),
      0,
    );

    // Calculate real contact growth interval distribution
    const now = new Date();
    const intervals = [28, 21, 14, 7, 0].map((daysAgo) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      const count = contactsHistory.filter((c) => c.createdAt <= d).length;
      return {
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        contacts: count,
      };
    });

    let subscriptionPayload = null;
    if (subscription) {
      const periodStart = new Date(subscription.currentPeriodStart || subscription.createdAt);
      const periodEnd = new Date(subscription.currentPeriodEnd || (subscription as any).trialEndsAt || now);

      // Calculate total duration in days
      const diffTotalMs = periodEnd.getTime() - periodStart.getTime();
      const totalDays = Math.max(1, Math.round(diffTotalMs / (1000 * 60 * 60 * 24)));

      // Calculate remaining days
      const diffRemainingMs = periodEnd.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(diffRemainingMs / (1000 * 60 * 60 * 24)));

      const isTrial = subscription.status === 'TRIALING' || Boolean(subscription.isTrial);
      const planName = subscription.plan?.name || subscription.planName || (isTrial ? '7-Day Free Trial' : 'Active Plan');

      subscriptionPayload = {
        plan: planName,
        status: subscription.status,
        isTrial,
        totalDays,
        remainingDays,
        usedDays: Math.max(0, totalDays - remainingDays),
        usedMessages: subscription.usedMessages ?? 0,
        maxMessages: subscription.maxMessages ?? subscription.plan?.maxMessages ?? 10000,
        usedBots: subscription.usedBots ?? bots.length,
        maxBots: subscription.maxBots ?? subscription.plan?.maxBots ?? 5,
        usedTeamSeats: teamMembersCount || subscription.usedTeamSeats || 1,
        maxTeamSeats: subscription.maxTeamSeats ?? (subscription.plan as any)?.maxTeamSeats ?? subscription.plan?.teamSeats ?? 10,
      };
    }

    return {
      success: true,
      data: {
        totalConversations,
        conversationsChange: totalConversations > 0 ? '+100%' : '0%',
        activeCampaigns: activeCampaignsCount,
        campaignsChange: activeCampaignsCount > 0 ? `+${activeCampaignsCount}` : '0',
        botInteractions: totalBotInteractions,
        botInteractionsChange: totalBotInteractions > 0 ? '+100%' : '0%',
        automationsRunning,
        automationsChange: automationsRunning > 0 ? `+${automationsRunning}` : '0',
        contactsCount,
        contactsChartData: intervals,
        recentCampaigns: recentCampaigns.map((c) => ({
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status === 'RUNNING' || c.status === 'LAUNCHING' ? 'Active' : c.status === 'SCHEDULED' ? 'Scheduled' : 'Draft',
          reach: c.audienceCount ? c.audienceCount.toLocaleString() : '0',
        })),
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          type: a.module?.toLowerCase().includes('chat')
            ? 'message'
            : a.module?.toLowerCase().includes('campaign')
            ? 'campaign'
            : a.module?.toLowerCase().includes('bot')
            ? 'bot'
            : a.module?.toLowerCase().includes('workflow')
            ? 'automation'
            : 'contact',
          title: a.action,
          time: a.createdAt ? a.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          status: a.status === 'Success' ? 'sent' : 'completed',
        })),
        subscription: subscriptionPayload,
      },
    };
  }

  async getActivity(tenantId: string) {
    const logs = await this.prisma.activityLog.findMany({
      where: { tenantId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: logs,
    };
  }
}
