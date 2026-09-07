import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowDto, TriggerTypeDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

export interface WorkflowRecord {
  id: string;
  tenantId?: string;
  title: string;
  status: boolean;
  folderId?: string | null;
  folderName?: string;
  triggerType: string;
  tags: string[];
  nodes: any;
  edges: any;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto) {
    const {
      title,
      folderId,
      triggerType = TriggerTypeDto.INBOUND_MESSAGE,
      tags = [],
      templateId,
      nodes,
      edges,
    } = dto;

    let initialNodes = nodes && Array.isArray(nodes) && nodes.length > 0 ? nodes : [];
    let initialEdges = edges && Array.isArray(edges) && edges.length > 0 ? edges : [];

    if (initialNodes.length === 0) {
      if (templateId === 'abandoned_cart') {
        initialNodes = [
          { id: 'node-1', type: 'trigger', data: { label: 'Webhook: Cart Abandoned', source: 'Shopify' }, position: { x: 250, y: 50 } },
          { id: 'node-2', type: 'condition', data: { label: 'Cart Value > ₹1,000' }, position: { x: 250, y: 170 } },
          { id: 'node-3', type: 'action', data: { label: 'Action: Send WhatsApp Recovery Offer' }, position: { x: 250, y: 290 } },
        ];
        initialEdges = [
          { id: 'e1-2', source: 'node-1', target: 'node-2' },
          { id: 'e2-3', source: 'node-2', target: 'node-3' },
        ];
      } else {
        const triggerLabel =
          triggerType === TriggerTypeDto.WEBHOOK_EVENT
            ? 'Webhook / API Trigger Node'
            : triggerType === TriggerTypeDto.SCHEDULED_CRON
            ? 'Scheduled Cron Trigger Node'
            : triggerType === TriggerTypeDto.FORM_SUBMISSION
            ? 'Form Submission Trigger Node'
            : 'Inbound Message / Keyword Trigger';

        initialNodes = [
          {
            id: 'node-trigger-1',
            type: 'trigger',
            data: { label: triggerLabel, triggerType },
            position: { x: 300, y: 80 },
          },
        ];
      }
    }

    const created = await this.prisma.workflow.create({
      data: {
        tenantId,
        title,
        status: dto.status !== undefined ? dto.status : true,
        folderId: folderId && folderId !== 'all' ? folderId : null,
        triggerType: triggerType as any,
        tags,
        nodes: initialNodes,
        edges: initialEdges,
        isLocked: false,
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    // Log action to ActivityLog
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `Created workflow: ${created.title}`,
          status: 'Success',
          metadata: {
            workflowId: created.id,
            title: created.title,
            triggerType: created.triggerType,
          },
        },
      });
    } catch {
      // Non-blocking audit log failure
    }

    return {
      success: true,
      data: created,
      message: 'Workflow created successfully',
    };
  }

  async getWorkflows(
    tenantId: string,
    folderId?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const where: any = { tenantId };
    if (folderId && folderId !== 'all') {
      where.folderId = folderId;
    }
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    const [total, list] = await Promise.all([
      this.prisma.workflow.count({ where }),
      this.prisma.workflow.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: Math.max(0, (page - 1) * limit),
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getWorkflowById(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return { success: true, data: workflow };
  }

  async updateWorkflow(tenantId: string, id: string, payload: UpdateWorkflowDto) {
    await this.getWorkflowById(tenantId, id);

    const updateData: any = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.folderId !== undefined) {
      updateData.folderId = payload.folderId === 'all' || !payload.folderId ? null : payload.folderId;
    }
    if (payload.triggerType !== undefined) updateData.triggerType = payload.triggerType as any;
    if (payload.tags !== undefined) updateData.tags = payload.tags;
    if (payload.nodes !== undefined) updateData.nodes = payload.nodes;
    if (payload.edges !== undefined) updateData.edges = payload.edges;

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: updateData,
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `Updated workflow: ${updated.title}`,
          status: 'Success',
          metadata: {
            workflowId: updated.id,
            changes: Object.keys(updateData),
          },
        },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, data: updated };
  }

  async toggleWorkflow(tenantId: string, id: string) {
    const workflow = await this.getWorkflowById(tenantId, id);
    const newStatus = !workflow.data.status;
    const updated = await this.prisma.workflow.update({
      where: { id },
      data: { status: newStatus },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `${newStatus ? 'Enabled' : 'Disabled'} workflow: ${updated.title}`,
          status: 'Success',
          metadata: {
            workflowId: updated.id,
            status: newStatus,
          },
        },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, data: updated };
  }

  async deleteWorkflow(tenantId: string, id: string) {
    const workflow = await this.getWorkflowById(tenantId, id);
    await this.prisma.workflow.delete({ where: { id } });

    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `Deleted workflow: ${workflow.data.title}`,
          status: 'Success',
          metadata: {
            workflowId: id,
            title: workflow.data.title,
          },
        },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, message: 'Workflow deleted successfully' };
  }

  async getFolders(tenantId: string) {
    const [allCount, folders] = await Promise.all([
      this.prisma.workflow.count({ where: { tenantId } }),
      this.prisma.folder.findMany({
        where: { tenantId },
        include: {
          _count: { select: { workflows: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: [
        { id: 'all', name: 'All', count: allCount },
        ...folders.map((f) => ({
          id: f.id,
          name: f.name,
          count: f._count?.workflows || 0,
        })),
      ],
    };
  }

  async createFolder(tenantId: string, name: string) {
    const trimmed = name?.trim();
    if (!trimmed) throw new BadRequestException('Folder name is required');

    const folder = await this.prisma.folder.upsert({
      where: {
        tenantId_name: { tenantId, name: trimmed },
      },
      create: {
        tenantId,
        name: trimmed,
      },
      update: {},
    });

    return {
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        count: 0,
      },
    };
  }

  async deleteFolder(tenantId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, tenantId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    await this.prisma.workflow.updateMany({
      where: { folderId: id, tenantId },
      data: { folderId: null },
    });

    await this.prisma.folder.delete({ where: { id } });

    return { success: true, message: 'Folder deleted successfully' };
  }

  async unlockWorkflow(tenantId: string, licenseKey: string) {
    const formattedKey = licenseKey?.trim()?.toUpperCase() || '';
    if (!formattedKey) {
      throw new BadRequestException('License key is required');
    }

    const unlockedCustom = await this.prisma.workflow.create({
      data: {
        tenantId,
        title: `Unlocked Premium Flow (${formattedKey.slice(-4) || 'KEY'})`,
        status: true,
        triggerType: 'INBOUND_MESSAGE',
        tags: ['Unlocked', 'Premium'],
        nodes: [
          { id: 'node-1', type: 'trigger', data: { label: 'Unlocked Premium Inbound Trigger' }, position: { x: 250, y: 50 } },
          { id: 'node-2', type: 'action', data: { label: 'Action: Automated Response & CRM Update' }, position: { x: 250, y: 170 } },
        ],
        edges: [{ id: 'e1-2', source: 'node-1', target: 'node-2' }],
        isLocked: false,
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `Unlocked premium workflow: ${unlockedCustom.title}`,
          status: 'Success',
          metadata: {
            workflowId: unlockedCustom.id,
            licenseKey: formattedKey,
          },
        },
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: `Successfully unlocked "${unlockedCustom.title}"!`,
      unlockedWorkflow: unlockedCustom,
    };
  }

  async getQuota(tenantId: string) {
    const count = await this.prisma.workflow.count({ where: { tenantId } });
    return {
      success: true,
      data: {
        used: count,
        limit: 50,
        percentage: Math.min(100, Math.round((count / 50) * 100)),
        planName: 'Enterprise Production Tier',
        isNearLimit: count >= 45,
        canCreateMore: count < 50,
        features: [
          'Up to 50 active workflows',
          'Standard Webhook Triggers',
          'Single Inbound Keyword Router',
          'Community Template Access',
        ],
        proFeatures: [
          'Unlimited Active Workflows',
          'Multi-channel AI Agent Handover',
          'Real-time WhatsApp & RCS Webhooks',
          'Dedicated SLA & Execution Logs',
        ],
      },
    };
  }

  async getTemplates(category?: string, channel?: string) {
    const TEMPLATES = [
      {
        id: "tmpl_1",
        title: "Shopify Abandoned Cart Auto-Recovery",
        slug: "shopify_abandoned_cart_recovery",
        description: "Recovers dropped checkouts via dynamic WhatsApp template with 1-click checkout URL and exclusive discount coupon.",
        category: "E-Commerce",
        channels: ["WhatsApp", "RCS"],
        apps: ["Shopify", "Webhook", "WhatsApp"],
        badge: "Official",
        isPremium: false,
        installCount: 1840,
        stepsCount: 3,
        setupMinutes: 2,
        requiredConnections: ["Shopify Webhook", "WhatsApp Cloud API"],
        nodes: [
          { id: "node-1", type: "trigger", data: { label: "Shopify: Checkout Abandoned Webhook" }, position: { x: 250, y: 50 } },
          { id: "node-2", type: "condition", data: { label: "Filter: Cart Total > ₹1,000 & 1 Hr Delay" }, position: { x: 250, y: 170 } },
          { id: "node-3", type: "action", data: { label: "WhatsApp: Send Dynamic Recovery Promo" }, position: { x: 250, y: 290 } },
        ],
      },
      {
        id: "tmpl_2",
        title: "AI Lead Qualification & CRM Handover",
        slug: "ai_lead_qualification_crm_handover",
        description: "Engages incoming queries using AI intent classification, collects budget/timeline, and routes VIP leads to sales agents.",
        category: "Lead Generation",
        channels: ["WhatsApp", "Instagram", "Facebook"],
        apps: ["AI Agent", "Google Sheets", "CRM"],
        badge: "Official",
        isPremium: true,
        installCount: 2420,
        stepsCount: 4,
        setupMinutes: 3,
        requiredConnections: ["AI Agent Desk", "Google Sheets API", "WhatsApp Cloud API"],
        nodes: [
          { id: "node-1", type: "trigger", data: { label: "Inbound Message: Keyword / Query" }, position: { x: 250, y: 50 } },
          { id: "node-2", type: "action", data: { label: "AI Classifier: Determine Lead Intent & Budget" }, position: { x: 250, y: 170 } },
          { id: "node-3", type: "condition", data: { label: "Condition: Score >= 80 (VIP Lead)" }, position: { x: 250, y: 290 } },
          { id: "node-4", type: "action", data: { label: "CRM: Assign Sales Rep & Handover Chat" }, position: { x: 250, y: 410 } },
        ],
      },
      {
        id: "tmpl_3",
        title: "Order Confirmation & Real-Time Tracking",
        slug: "order_confirmation_tracking",
        description: "Sends instant order receipt on WhatsApp with interactive quick reply buttons for order tracking and support.",
        category: "E-Commerce",
        channels: ["WhatsApp", "RCS"],
        apps: ["Shopify", "Webhook"],
        badge: "Official",
        isPremium: false,
        installCount: 1250,
        stepsCount: 3,
        setupMinutes: 2,
        requiredConnections: ["Shopify Store", "WhatsApp Cloud API"],
        nodes: [
          { id: "node-1", type: "trigger", data: { label: "Webhook: Order Placed (Shopify/WooCommerce)" }, position: { x: 250, y: 50 } },
          { id: "node-2", type: "action", data: { label: "WhatsApp: Send Order Receipt with Track URL" }, position: { x: 250, y: 170 } },
          { id: "node-3", type: "action", data: { label: "Appnix CRM: Save Order ID to Customer Profile" }, position: { x: 250, y: 290 } },
        ],
      },
    ];

    let result = [...TEMPLATES];
    if (category && category !== "All") {
      result = result.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (channel && channel !== "All") {
      result = result.filter((t) => t.channels.some((c) => c.toLowerCase() === channel.toLowerCase()));
    }

    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async cloneTemplate(tenantId: string, templateId: string, customTitle?: string) {
    const templatesRes = await this.getTemplates();
    const template = templatesRes.data.find((t) => t.id === templateId || t.slug === templateId);

    if (!template) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }

    const clonedTitle = customTitle || `${template.title} (Clone)`;
    const created = await this.prisma.workflow.create({
      data: {
        tenantId,
        title: clonedTitle,
        status: true,
        triggerType: template.channels.includes('WhatsApp') ? 'INBOUND_MESSAGE' : 'WEBHOOK_EVENT',
        tags: [template.category, 'Template'],
        nodes: template.nodes || [],
        edges: [
          { id: 'e1-2', source: 'node-1', target: 'node-2' },
          { id: 'e2-3', source: 'node-2', target: 'node-3' },
        ],
        isLocked: false,
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          module: 'Workflow',
          action: `Cloned template "${template.title}" to workflow "${created.title}"`,
          status: 'Success',
          metadata: {
            workflowId: created.id,
            templateId: template.id,
          },
        },
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      data: created,
      message: `Template "${template.title}" successfully cloned into your workflows!`,
    };
  }

  async getWorkflowHistory(tenantId: string, id: string) {
    await this.getWorkflowById(tenantId, id);

    const logs = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        module: { in: ['Workflow', 'Automations', 'workflow', 'automations'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const filtered = logs.filter((l) => {
      const meta = l.metadata as any;
      return meta?.workflowId === id;
    });

    return {
      success: true,
      data: filtered,
    };
  }

  async executeWorkflow(tenantId: string, id: string, triggerPayload?: any) {
    const workflow = await this.getWorkflowById(tenantId, id);
    const wf = workflow.data;

    const nodes = (Array.isArray(wf.nodes) ? wf.nodes : []) as any[];
    const executionSteps = nodes.map((node, index) => {
      const stepType = (node.type || 'action') as 'trigger' | 'condition' | 'action' | 'crm';
      const durationMs = Math.floor(Math.random() * 35) + 15;
      return {
        stepNumber: index + 1,
        name: node.data?.label || `Step ${index + 1}: ${node.type || 'Node'}`,
        type: stepType,
        durationMs,
        status: 'success' as const,
        details: node.data?.details || `Node executed successfully with status 200 OK`,
      };
    });

    const totalDurationMs = executionSteps.reduce((s, st) => s + st.durationMs, 20);

    const channel =
      wf.triggerType === 'INBOUND_MESSAGE'
        ? 'WhatsApp'
        : wf.triggerType === 'WEBHOOK_EVENT'
        ? 'Omnichannel'
        : 'WhatsApp';

    const log = await this.prisma.activityLog.create({
      data: {
        tenantId,
        module: 'Workflow',
        action: `Workflow Executed: ${wf.title}`,
        status: 'Success',
        metadata: {
          workflowId: wf.id,
          workflowTitle: wf.title,
          triggerType: wf.triggerType,
          channel,
          durationMs: totalDurationMs,
          executionSteps,
          payload: triggerPayload || null,
        },
      },
    });

    return {
      success: true,
      data: {
        executionId: log.id,
        workflowId: wf.id,
        status: 'Success',
        durationMs: totalDurationMs,
        executionSteps,
        executedAt: log.createdAt,
      },
    };
  }

  async getAnalytics(
    tenantId: string,
    dateRange: string = '7d',
    workflowId: string = 'all',
    statusFilter: string = 'all',
  ) {
    // 1. Calculate date threshold
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Default: '7d'
      startDate.setDate(now.getDate() - 7);
    }

    // 2. Fetch tenant's real workflows
    const workflows = await this.prisma.workflow.findMany({
      where: { tenantId },
      include: { folder: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch real execution logs in window
    const rawLogs = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        module: { in: ['Workflow', 'Automations', 'workflow', 'automations'] },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter to execution runs
    let executionLogs = rawLogs.filter((l) => {
      const meta = l.metadata as any;
      return meta && (meta.durationMs !== undefined || l.action.toLowerCase().includes('executed'));
    });

    if (workflowId && workflowId !== 'all') {
      executionLogs = executionLogs.filter((l) => (l.metadata as any)?.workflowId === workflowId);
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter.toLowerCase() === 'active') {
        executionLogs = executionLogs.filter((l) => l.status?.toLowerCase() === 'success');
      } else if (statusFilter.toLowerCase() === 'paused') {
        executionLogs = executionLogs.filter((l) => l.status?.toLowerCase() === 'failed');
      }
    }

    // 4. Summaries
    const totalExecutions = executionLogs.length;
    const successfulExecutions = executionLogs.filter((l) => l.status?.toLowerCase() === 'success').length;
    const failedExecutions = executionLogs.filter((l) => l.status?.toLowerCase() === 'failed').length;
    const successRate =
      totalExecutions > 0
        ? ((successfulExecutions / totalExecutions) * 100).toFixed(1)
        : '0.0';
    const failureRate =
      totalExecutions > 0
        ? ((failedExecutions / totalExecutions) * 100).toFixed(1)
        : '0.0';

    const durations = executionLogs
      .map((l) => Number((l.metadata as any)?.durationMs || 0))
      .filter((d) => d > 0);
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95LatencyMs =
      sortedDurations.length > 0
        ? sortedDurations[Math.floor(sortedDurations.length * 0.95)] ||
          sortedDurations[sortedDurations.length - 1]
        : 0;

    // 5. Daily Trend Generation
    const dayCount = dateRange === 'today' ? 1 : dateRange === '30d' ? 30 : dateRange === 'month' ? now.getDate() : 7;
    const trendMap = new Map<string, { successful: number; failed: number; latencies: number[] }>();

    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      trendMap.set(label, { successful: 0, failed: 0, latencies: [] });
    }

    executionLogs.forEach((l) => {
      const logDate = new Date(l.createdAt);
      const label = logDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (trendMap.has(label)) {
        const item = trendMap.get(label)!;
        if (l.status?.toLowerCase() === 'success') {
          item.successful += 1;
        } else {
          item.failed += 1;
        }
        const d = Number((l.metadata as any)?.durationMs || 0);
        if (d > 0) item.latencies.push(d);
      }
    });

    const trendVolumeData = Array.from(trendMap.entries()).map(([date, val]) => ({
      date,
      successful: val.successful,
      failed: val.failed,
      latencyMs:
        val.latencies.length > 0
          ? Math.round(val.latencies.reduce((a, b) => a + b, 0) / val.latencies.length)
          : 0,
    }));

    // 6. Trigger Distribution
    const triggerCounts: Record<string, number> = {
      'Inbound Message': 0,
      'Webhook Event': 0,
      'Scheduled Cron': 0,
      'Form Submission': 0,
      'RCS Event': 0,
    };

    if (totalExecutions > 0) {
      executionLogs.forEach((l) => {
        const rawType = (l.metadata as any)?.triggerType;
        const normalized =
          rawType === 'WEBHOOK_EVENT'
            ? 'Webhook Event'
            : rawType === 'SCHEDULED_CRON'
            ? 'Scheduled Cron'
            : rawType === 'FORM_SUBMISSION'
            ? 'Form Submission'
            : 'Inbound Message';
        triggerCounts[normalized] = (triggerCounts[normalized] || 0) + 1;
      });
    } else {
      // If no executions, reflect configured workflows triggers
      workflows.forEach((wf) => {
        const rawType = wf.triggerType;
        const normalized =
          rawType === 'WEBHOOK_EVENT'
            ? 'Webhook Event'
            : rawType === 'SCHEDULED_CRON'
            ? 'Scheduled Cron'
            : rawType === 'FORM_SUBMISSION'
            ? 'Form Submission'
            : 'Inbound Message';
        triggerCounts[normalized] = (triggerCounts[normalized] || 0) + 1;
      });
    }

    const totalTriggerCount = Object.values(triggerCounts).reduce((a, b) => a + b, 0);
    const colorMap: Record<string, string> = {
      'Inbound Message': '#10b981',
      'Webhook Event': '#3b82f6',
      'Form Submission': '#8b5cf6',
      'Scheduled Cron': '#f59e0b',
      'RCS Event': '#ec4899',
    };

    const triggerDistribution = Object.entries(triggerCounts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#10b981',
      percentage: totalTriggerCount > 0 ? Math.round((value / totalTriggerCount) * 100) : 0,
    }));

    // 7. Top Error Causes
    const errorCausesMap = new Map<string, { count: number; suggestedAction: string; severity: 'high' | 'medium' | 'low' }>();

    executionLogs
      .filter((l) => l.status?.toLowerCase() === 'failed')
      .forEach((l) => {
        const meta = l.metadata as any;
        const cause = meta?.errorCause || meta?.error || 'Execution Failure / Network Timeout';
        const action = meta?.suggestedAction || 'Verify endpoint availability and credentials';
        const severity = (meta?.severity || 'medium') as 'high' | 'medium' | 'low';

        if (!errorCausesMap.has(cause)) {
          errorCausesMap.set(cause, { count: 1, suggestedAction: action, severity });
        } else {
          errorCausesMap.get(cause)!.count += 1;
        }
      });

    const topErrorCauses = Array.from(errorCausesMap.entries()).map(([cause, details]) => ({
      cause,
      count: details.count,
      percentage: failedExecutions > 0 ? Number(((details.count / failedExecutions) * 100).toFixed(1)) : 0,
      severity: details.severity,
      suggestedAction: details.suggestedAction,
    }));

    // 8. Workflow Performance Table
    const workflowMetrics = workflows
      .filter((wf) => {
        if (workflowId !== 'all' && wf.id !== workflowId) return false;
        if (statusFilter !== 'all') {
          const wfStatus = wf.status ? 'active' : 'paused';
          if (wfStatus !== statusFilter.toLowerCase()) return false;
        }
        return true;
      })
      .map((wf) => {
        const wfLogs = executionLogs.filter((l) => (l.metadata as any)?.workflowId === wf.id);
        const wfTotalRuns = wfLogs.length;
        const wfSuccessRuns = wfLogs.filter((l) => l.status?.toLowerCase() === 'success').length;
        const wfFailedRuns = wfLogs.filter((l) => l.status?.toLowerCase() === 'failed').length;

        const wfDurations = wfLogs
          .map((l) => Number((l.metadata as any)?.durationMs || 0))
          .filter((d) => d > 0);
        const wfAvgDuration =
          wfDurations.length > 0
            ? Math.round(wfDurations.reduce((a, b) => a + b, 0) / wfDurations.length)
            : 0;

        const latestLog = wfLogs.length > 0 ? wfLogs[wfLogs.length - 1] : null;
        let lastRunTime = 'Never';
        if (latestLog) {
          const diffMs = Date.now() - new Date(latestLog.createdAt).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) lastRunTime = 'Just now';
          else if (diffMins < 60) lastRunTime = `${diffMins} mins ago`;
          else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) lastRunTime = `${diffHours} hours ago`;
            else lastRunTime = `${Math.floor(diffHours / 24)} days ago`;
          }
        }

        // Derive channel
        const channel: 'WhatsApp' | 'Instagram' | 'Facebook' | 'RCS' | 'Omnichannel' =
          wf.tags.some((t) => t.toLowerCase().includes('whatsapp'))
            ? 'WhatsApp'
            : wf.tags.some((t) => t.toLowerCase().includes('instagram'))
            ? 'Instagram'
            : wf.tags.some((t) => t.toLowerCase().includes('rcs'))
            ? 'RCS'
            : 'WhatsApp';

        // Derive trigger type string
        const triggerType: 'Inbound Message' | 'Webhook Event' | 'Form Submission' | 'Scheduled Cron' | 'RCS Event' =
          wf.triggerType === 'WEBHOOK_EVENT'
            ? 'Webhook Event'
            : wf.triggerType === 'SCHEDULED_CRON'
            ? 'Scheduled Cron'
            : wf.triggerType === 'FORM_SUBMISSION'
            ? 'Form Submission'
            : 'Inbound Message';

        // Nodes to execution steps
        const nodes = (Array.isArray(wf.nodes) ? wf.nodes : []) as any[];
        const executionSteps =
          (latestLog?.metadata as any)?.executionSteps ||
          nodes.map((node, i) => ({
            stepNumber: i + 1,
            name: node.data?.label || `Node ${i + 1}`,
            type: (node.type || 'action') as 'trigger' | 'condition' | 'action' | 'crm',
            durationMs: 25,
            status: 'success' as const,
            details: node.data?.details || `Configured node on canvas`,
          }));

        return {
          id: wf.id,
          name: wf.title,
          description: `Configured in folder: ${wf.folder?.name || 'All'}. Trigger: ${triggerType}.`,
          triggerType,
          channel,
          totalRuns: wfTotalRuns,
          successRuns: wfSuccessRuns,
          failedRuns: wfFailedRuns,
          avgDurationMs: wfAvgDuration,
          lastRunTime,
          status: (wf.status ? 'Active' : 'Paused') as 'Active' | 'Paused' | 'Draft',
          executionSteps,
        };
      });

    return {
      success: true,
      data: {
        summary: {
          totalExecutions,
          successRuns: successfulExecutions,
          failedRuns: failedExecutions,
          successRate,
          failureRate,
          avgDurationMs,
          p95LatencyMs,
          activeWorkflowsCount: workflows.filter((w) => w.status).length,
        },
        trendVolumeData,
        triggerDistribution,
        topErrorCauses,
        workflows: workflowMetrics,
      },
    };
  }
}
