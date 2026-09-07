import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWhatsAppTemplateDto,
  UpdateWhatsAppTemplateDto,
  TemplateQueryDto,
  WhatsAppTemplateStatus,
  TemplateCategory,
  TemplateContentType,
  SimulateReviewDto,
} from './dto/whatsapp-template.dto';

export interface WhatsAppTemplateEntity {
  id: string;
  tenantId: string;
  channelId?: string;
  name: string;
  category: TemplateCategory;
  language: string;
  contentType: TemplateContentType;
  header?: any;
  body: string;
  variables: any[];
  variableMappings?: Record<string, string>;
  footer?: string;
  buttons?: any[];
  catalog?: any;
  carouselCards?: any[];
  status: WhatsAppTemplateStatus;
  metaTemplateId?: string;
  rejectionReason?: string;
  rejectionDetails?: {
    code: string;
    reason: string;
    recommendation: string;
    date: string;
  };
  preview?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
}

@Injectable()
export class WhatsAppTemplatesService {
  // In-memory cache & fallback store for resilient operation
  private memoryStore = new Map<string, WhatsAppTemplateEntity[]>();

  constructor(private prisma: PrismaService) {
    this.seedDefaultTemplates('demo-tenant');
  }

  private seedDefaultTemplates(tenantId: string) {
    if (this.memoryStore.has(tenantId)) return;
    this.memoryStore.set(tenantId, []);
  }

  private getStore(tenantId: string): WhatsAppTemplateEntity[] {
    const resolvedTenant = tenantId || 'demo-tenant';
    if (!this.memoryStore.has(resolvedTenant)) {
      this.seedDefaultTemplates(resolvedTenant);
    }
    return this.memoryStore.get(resolvedTenant)!;
  }

  async findAll(tenantId: string, query: TemplateQueryDto = {}) {
    const resolvedTenant = tenantId || 'demo-tenant';
    let templates = this.getStore(resolvedTenant);

    // Filter by search
    if (query.search?.trim()) {
      const q = query.search.toLowerCase().trim();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          (t.metaTemplateId && t.metaTemplateId.toLowerCase().includes(q)),
      );
    }

    // Filter by category
    if (query.category && query.category !== 'ALL') {
      templates = templates.filter((t) => t.category === query.category);
    }

    // Filter by status
    if (query.status && query.status !== 'ALL') {
      templates = templates.filter((t) => t.status === query.status);
    }

    // Filter by language
    if (query.language && query.language !== 'ALL') {
      templates = templates.filter((t) => t.language === query.language);
    }

    // Sort
    const sortBy = query.sortBy || 'latest';
    templates.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const total = templates.length;
    const paginated = templates.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        total,
        approved: templates.filter((t) => t.status === WhatsAppTemplateStatus.APPROVED).length,
        pending: templates.filter((t) => t.status === WhatsAppTemplateStatus.PENDING).length,
        draft: templates.filter((t) => t.status === WhatsAppTemplateStatus.DRAFT).length,
        rejected: templates.filter((t) => t.status === WhatsAppTemplateStatus.REJECTED).length,
        disabled: templates.filter((t) => t.status === WhatsAppTemplateStatus.DISABLED).length,
      },
    };
  }

  async findById(tenantId: string, id: string): Promise<WhatsAppTemplateEntity> {
    const store = this.getStore(tenantId);
    const template = store.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async create(tenantId: string, dto: CreateWhatsAppTemplateDto): Promise<WhatsAppTemplateEntity> {
    const store = this.getStore(tenantId);

    // Check unique name
    const existing = store.find(
      (t) => t.name.toLowerCase() === dto.name.toLowerCase() && t.language === dto.language,
    );
    if (existing) {
      throw new ConflictException(
        `A template with name "${dto.name}" and language "${dto.language}" already exists.`,
      );
    }

    const newId = `tpl-${Date.now()}`;
    const preview = this.generatePreview(dto.body, dto.variables || []);

    const newTemplate: WhatsAppTemplateEntity = {
      id: newId,
      tenantId: tenantId || 'demo-tenant',
      channelId: dto.channelId || '1',
      name: dto.name.toLowerCase().trim(),
      category: dto.category,
      language: dto.language,
      contentType: dto.contentType,
      header: dto.header,
      body: dto.body,
      variables: dto.variables || [],
      variableMappings: dto.variableMappings || {},
      footer: dto.footer,
      buttons: dto.buttons || [],
      catalog: dto.catalog,
      carouselCards: dto.carouselCards || [],
      status: dto.status || WhatsAppTemplateStatus.DRAFT,
      metaTemplateId:
        dto.status === WhatsAppTemplateStatus.PENDING || dto.status === WhatsAppTemplateStatus.APPROVED
          ? `meta_tpl_${Math.floor(10000000 + Math.random() * 90000000)}`
          : undefined,
      preview,
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: dto.status === WhatsAppTemplateStatus.PENDING ? new Date() : undefined,
      approvedAt: dto.status === WhatsAppTemplateStatus.APPROVED ? new Date() : undefined,
    };

    store.unshift(newTemplate);
    return newTemplate;
  }

  async update(tenantId: string, id: string, dto: UpdateWhatsAppTemplateDto): Promise<WhatsAppTemplateEntity> {
    const store = this.getStore(tenantId);
    const index = store.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const current = store[index];

    if (dto.name && dto.name !== current.name) {
      const duplicate = store.find(
        (t) =>
          t.id !== id &&
          t.name.toLowerCase() === dto.name!.toLowerCase() &&
          t.language === (dto.language || current.language),
      );
      if (duplicate) {
        throw new ConflictException(`A template with name "${dto.name}" already exists.`);
      }
    }

    const updatedBody = dto.body !== undefined ? dto.body : current.body;
    const updatedVariables = dto.variables !== undefined ? dto.variables : current.variables;
    const preview = this.generatePreview(updatedBody, updatedVariables);

    const updatedTemplate: WhatsAppTemplateEntity = {
      ...current,
      ...dto,
      name: dto.name ? dto.name.toLowerCase().trim() : current.name,
      body: updatedBody,
      variables: updatedVariables,
      preview,
      updatedAt: new Date(),
    };

    // If re-editing a rejected template and changing status to DRAFT
    if (current.status === WhatsAppTemplateStatus.REJECTED && dto.status === WhatsAppTemplateStatus.DRAFT) {
      updatedTemplate.rejectionReason = undefined;
      updatedTemplate.rejectionDetails = undefined;
    }

    store[index] = updatedTemplate;
    return updatedTemplate;
  }

  async submitForApproval(tenantId: string, id: string): Promise<WhatsAppTemplateEntity> {
    const template = await this.findById(tenantId, id);

    // Validate requirements before submission
    if (!template.body || template.body.trim().length === 0) {
      throw new BadRequestException('Cannot submit template with empty message body');
    }

    const metaTemplateId = template.metaTemplateId || `meta_tpl_${Math.floor(10000000 + Math.random() * 90000000)}`;

    const updated: WhatsAppTemplateEntity = {
      ...template,
      status: WhatsAppTemplateStatus.PENDING,
      metaTemplateId,
      submittedAt: new Date(),
      updatedAt: new Date(),
      rejectionReason: undefined,
      rejectionDetails: undefined,
    };

    const store = this.getStore(tenantId);
    const index = store.findIndex((t) => t.id === id);
    store[index] = updated;

    return updated;
  }

  async duplicate(tenantId: string, id: string): Promise<WhatsAppTemplateEntity> {
    const original = await this.findById(tenantId, id);
    const newId = `tpl-${Date.now()}`;
    const newName = `${original.name}_copy_${Math.floor(Math.random() * 1000)}`;

    const copy: WhatsAppTemplateEntity = {
      ...original,
      id: newId,
      name: newName,
      status: WhatsAppTemplateStatus.DRAFT,
      metaTemplateId: undefined,
      rejectionReason: undefined,
      rejectionDetails: undefined,
      submittedAt: undefined,
      approvedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const store = this.getStore(tenantId);
    store.unshift(copy);
    return copy;
  }

  async delete(tenantId: string, id: string): Promise<{ success: boolean; message: string }> {
    const store = this.getStore(tenantId);
    const index = store.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    store.splice(index, 1);
    return { success: true, message: 'Template removed successfully' };
  }

  async simulateReview(tenantId: string, id: string, dto: SimulateReviewDto): Promise<WhatsAppTemplateEntity> {
    const template = await this.findById(tenantId, id);
    const store = this.getStore(tenantId);
    const index = store.findIndex((t) => t.id === id);

    if (dto.status === WhatsAppTemplateStatus.APPROVED) {
      template.status = WhatsAppTemplateStatus.APPROVED;
      template.approvedAt = new Date();
      template.rejectionReason = undefined;
      template.rejectionDetails = undefined;
    } else if (dto.status === WhatsAppTemplateStatus.REJECTED) {
      template.status = WhatsAppTemplateStatus.REJECTED;
      template.rejectionReason = dto.rejectionReason || 'Policy violation detected in template content.';
      template.rejectionDetails = {
        code: dto.rejectionCode || 'INVALID_FORMAT_OR_POLICY_VIOLATION',
        reason: dto.rejectionReason || 'Policy violation detected in template content.',
        recommendation: dto.recommendation || 'Review Meta template guidelines and update variables or category.',
        date: new Date().toISOString(),
      };
    }

    template.updatedAt = new Date();
    store[index] = template;
    return template;
  }

  private generatePreview(body: string, variables: any[]): string {
    if (!body) return '';
    let text = body;
    if (Array.isArray(variables)) {
      variables.forEach((v) => {
        const placeholder = `{{${v.index}}}`;
        const sample = v.sampleValue || `[${v.name || 'Sample'}]`;
        text = text.replaceAll(placeholder, sample);
      });
    }
    return text;
  }

  // In-memory workspace quotas for WhatsApp Flows
  private flowQuotas = new Map<
    string,
    {
      planTier: string;
      maxPublishedFlows: number;
      publishedFlowsUsed: number;
      dynamicEndpointsUnlocked: boolean;
      dataEncryptionUnlocked: boolean;
      webhookRoutingUnlocked: boolean;
      advancedAnalyticsUnlocked: boolean;
      multiWabaUnlocked: boolean;
      redeemedKeys: string[];
    }
  >();

  private getTenantQuota(tenantId: string) {
    if (!this.flowQuotas.has(tenantId)) {
      this.flowQuotas.set(tenantId, {
        planTier: 'Starter Plan',
        maxPublishedFlows: 5,
        publishedFlowsUsed: 2,
        dynamicEndpointsUnlocked: false,
        dataEncryptionUnlocked: true,
        webhookRoutingUnlocked: true,
        advancedAnalyticsUnlocked: false,
        multiWabaUnlocked: false,
        redeemedKeys: [],
      });
    }
    return this.flowQuotas.get(tenantId)!;
  }

  async getFlowQuota(tenantId: string) {
    const q = this.getTenantQuota(tenantId);
    return {
      success: true,
      data: {
        planTier: q.planTier,
        maxPublishedFlows: q.maxPublishedFlows,
        publishedFlowsUsed: q.publishedFlowsUsed,
        availableSlots: Math.max(0, q.maxPublishedFlows - q.publishedFlowsUsed),
        percentageUsed: Math.min(100, Math.round((q.publishedFlowsUsed / q.maxPublishedFlows) * 100)),
        features: [
          {
            key: 'published_flows',
            label: `Up to ${q.maxPublishedFlows} Published Flows`,
            unlocked: true,
            description: 'Simultaneously active customer-facing mini-apps',
          },
          {
            key: 'dynamic_endpoints',
            label: 'Dynamic Data API Endpoints',
            unlocked: q.dynamicEndpointsUnlocked,
            description: 'Fetch real-time products, pricing, and slots from external backends',
          },
          {
            key: 'data_encryption',
            label: 'AES-256 Client-Side Form Encryption',
            unlocked: q.dataEncryptionUnlocked,
            description: 'End-to-end tokenized payload transit inside WhatsApp',
          },
          {
            key: 'webhook_routing',
            label: 'Automation Webhook Triggers',
            unlocked: q.webhookRoutingUnlocked,
            description: 'Trigger workflow nodes automatically upon form completion',
          },
          {
            key: 'advanced_analytics',
            label: 'Screen Drop-off & Funnel Analytics',
            unlocked: q.advancedAnalyticsUnlocked,
            description: 'Detailed per-screen drop-off metrics & conversion rates',
          },
          {
            key: 'multi_waba',
            label: 'Multi-WABA Number Routing',
            unlocked: q.multiWabaUnlocked,
            description: 'Deploy the same flow across multiple phone numbers',
          },
        ],
      },
    };
  }

  async unlockFlowQuota(tenantId: string, licenseKey: string) {
    const formattedKey = (licenseKey || '').trim().toUpperCase();

    if (!formattedKey) {
      throw new BadRequestException('License key is required.');
    }

    const q = this.getTenantQuota(tenantId);

    // Check if key was already redeemed by this tenant
    if (q.redeemedKeys.includes(formattedKey)) {
      throw new ConflictException('This license key has already been redeemed for this workspace.');
    }

    // Demo Keys Dictionary
    const KNOWN_KEYS: Record<
      string,
      {
        planTier: string;
        bonusFlows: number;
        dynamicEndpoints: boolean;
        analytics: boolean;
        multiWaba: boolean;
        status: 'active' | 'expired' | 'claimed';
      }
    > = {
      'FLOW-PRO8-2026-UNLK': {
        planTier: 'Professional Growth Plan',
        bonusFlows: 10,
        dynamicEndpoints: true,
        analytics: true,
        multiWaba: true,
        status: 'active',
      },
      'FLOW-ENT9-9921-MAX': {
        planTier: 'Enterprise Unlimited Suite',
        bonusFlows: 95,
        dynamicEndpoints: true,
        analytics: true,
        multiWaba: true,
        status: 'active',
      },
      'FLOW-EXPD-2025-0001': {
        planTier: 'Expired Promotional Key',
        bonusFlows: 5,
        dynamicEndpoints: false,
        analytics: false,
        multiWaba: false,
        status: 'expired',
      },
      'FLOW-USED-8812-CLAIM': {
        planTier: 'Claimed Single-Use Voucher',
        bonusFlows: 5,
        dynamicEndpoints: false,
        analytics: false,
        multiWaba: false,
        status: 'claimed',
      },
    };

    const keyConfig = KNOWN_KEYS[formattedKey];

    // Check pre-configured demo keys
    if (keyConfig) {
      if (keyConfig.status === 'expired') {
        throw new BadRequestException('This activation key expired on Dec 31, 2025.');
      }
      if (keyConfig.status === 'claimed') {
        throw new ConflictException('This voucher key has already been claimed by another organization.');
      }

      q.planTier = keyConfig.planTier;
      q.maxPublishedFlows += keyConfig.bonusFlows;
      q.dynamicEndpointsUnlocked = keyConfig.dynamicEndpoints || q.dynamicEndpointsUnlocked;
      q.advancedAnalyticsUnlocked = keyConfig.analytics || q.advancedAnalyticsUnlocked;
      q.multiWabaUnlocked = keyConfig.multiWaba || q.multiWabaUnlocked;
      q.redeemedKeys.push(formattedKey);

      return {
        success: true,
        message: `Successfully unlocked ${keyConfig.planTier}! +${keyConfig.bonusFlows} published flows added.`,
        data: {
          planTier: q.planTier,
          newMaxPublishedFlows: q.maxPublishedFlows,
          publishedFlowsUsed: q.publishedFlowsUsed,
          unlockedFeatures: [
            `+${keyConfig.bonusFlows} Active Published Flows`,
            'Dynamic Data API Endpoints',
            'Screen Drop-off & Funnel Analytics',
            'Multi-WABA Number Routing',
          ],
        },
      };
    }

    // Pattern validator for dynamic keys (FLOW-XXXX-XXXX-XXXX or APNX-FLOW-XXXX-XXXX)
    const validPattern = /^(FLOW|APNX-FLOW)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formattedKey);
    if (!validPattern) {
      throw new BadRequestException(
        'Invalid license key format. Expected format: FLOW-XXXX-XXXX-XXXX (e.g. FLOW-PRO8-2026-UNLK).',
      );
    }

    // Redeem valid custom key
    q.planTier = 'Pro Plan (Custom License)';
    q.maxPublishedFlows += 10;
    q.dynamicEndpointsUnlocked = true;
    q.advancedAnalyticsUnlocked = true;
    q.multiWabaUnlocked = true;
    q.redeemedKeys.push(formattedKey);

    return {
      success: true,
      message: `Successfully activated license key ${formattedKey}! Your workspace limit has been upgraded to ${q.maxPublishedFlows} published flows.`,
      data: {
        planTier: q.planTier,
        newMaxPublishedFlows: q.maxPublishedFlows,
        publishedFlowsUsed: q.publishedFlowsUsed,
        unlockedFeatures: [
          '+10 Active Published Flows',
          'Dynamic Data API Endpoints',
          'Screen Drop-off & Funnel Analytics',
          'Multi-WABA Channel Routing',
        ],
      },
    };
  }
}
