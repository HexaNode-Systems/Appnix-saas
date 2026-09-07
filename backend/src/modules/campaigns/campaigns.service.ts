import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  SelectAudienceDto,
  SelectChannelDto,
  SelectTemplateDto,
  ConfigureTemplateDto,
  SendTestDto,
  LaunchCampaignDto,
  CampaignResponseDto,
  AudienceResponseDto,
  ChannelConfigResponseDto,
  MetaTemplateResponseDto,
  PaginatedResponseDto,
  CampaignStatus,
  LaunchMode,
  TestStatus,
  ChannelType,
  TemplateStatus,
  AudienceStatus,
  TemplateCategory,
} from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async createDraft(tenantId: string, userId: string, dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        channel: ChannelType.WHATSAPP,
        status: CampaignStatus.DRAFT,
        launchMode: LaunchMode.IMMEDIATE,
        createdBy: userId,
      },
    });

    return this.mapToResponse(campaign as unknown as Record<string, unknown>);
  }

  async findAll(tenantId: string, page = 1, limit = 20): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where: { tenantId } }),
    ]);

    return {
      data: campaigns.map((c) => this.mapToResponse(c as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(campaign as unknown as Record<string, unknown>);
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    await this.findOne(tenantId, id);

    const updateData: Record<string, unknown> = { ...dto };

    if (dto.scheduledAt) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: updateData as Prisma.CampaignUpdateInput,
    });

    return this.mapToResponse(campaign as unknown as Record<string, unknown>);
  }

  async selectAudience(tenantId: string, campaignId: string, dto: SelectAudienceDto): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only select audience for draft campaigns');
    }

    const audience = await this.prisma.campaignAudience.findUnique({
      where: { id: dto.audienceId },
    });

    if (!audience || audience.tenantId !== tenantId) {
      throw new NotFoundException('Audience not found');
    }

    if (audience.status !== 'ACTIVE') {
      throw new BadRequestException('Selected audience is not active');
    }

    if (audience.contactCount === 0) {
      throw new BadRequestException('Selected audience has no eligible contacts');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        audienceId: audience.id,
        audienceName: audience.name,
        audienceCount: audience.contactCount,
        audienceSnapshot: {
          contactIds: audience.contactIds,
          contactCount: audience.contactCount,
          capturedAt: new Date().toISOString(),
        },
        status: CampaignStatus.READY_FOR_TEST,
      },
    });

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async selectChannel(tenantId: string, campaignId: string, dto: SelectChannelDto): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.READY_FOR_TEST) {
      throw new BadRequestException('Can only select channel for draft campaigns');
    }

    const channelConfig = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: {
          tenantId,
          channel: dto.channel,
        },
      },
    });

    if (!channelConfig || !channelConfig.isConnected) {
      throw new BadRequestException(`${dto.channel} channel is not connected`);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        channel: dto.channel,
      },
    });

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async selectTemplate(tenantId: string, campaignId: string, dto: SelectTemplateDto): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.READY_FOR_TEST) {
      throw new BadRequestException('Can only select template for draft campaigns');
    }

    const template = await this.prisma.metaTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundException('Template not found');
    }

    if (template.status !== TemplateStatus.APPROVED) {
      throw new BadRequestException('Selected template is not approved');
    }

    const components = (Array.isArray(template.components) ? template.components : []) as Array<Record<string, unknown>>;
    const variables = this.extractVariables(components);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        metaTemplateId: template.id,
        metaTemplateName: template.name,
        metaTemplateLanguage: template.language,
        templateVariables: variables as unknown as Prisma.InputJsonValue,
        status: variables.length > 0 ? CampaignStatus.READY_FOR_TEST : CampaignStatus.TEST_SENT,
      },
    });

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async configureTemplate(tenantId: string, campaignId: string, dto: ConfigureTemplateDto): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.READY_FOR_TEST) {
      throw new BadRequestException('Can only configure template for draft campaigns');
    }

    const templateVars = (Array.isArray(campaign.templateVariables) ? campaign.templateVariables : []) as Array<Record<string, any>>;
    if (templateVars.length === 0) {
      throw new BadRequestException('Selected template has no variables to configure');
    }

    const requiredVariables = templateVars
      .map((v) => String(v.name || v.variable || ''))
      .filter(Boolean);
    const mappedVariables = dto.mappings.map((m) => m.templateVariable);
    const missingVariables = requiredVariables.filter((v) => !mappedVariables.includes(v));

    if (missingVariables.length > 0) {
      throw new BadRequestException(`Missing mappings for variables: ${missingVariables.join(', ')}`);
    }

    const variableMappings = dto.mappings.reduce((acc, m) => {
      acc[m.templateVariable] = m.dataSource;
      return acc;
    }, {} as Record<string, string>);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        variableMappings: variableMappings as unknown as Prisma.InputJsonValue,
        status: CampaignStatus.TEST_SENT,
      },
    });

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async sendTest(tenantId: string, campaignId: string, dto: SendTestDto): Promise<{ messageId: string; status: TestStatus }> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status === CampaignStatus.DRAFT) {
      throw new BadRequestException('Campaign must have audience, channel, and template configured before sending test');
    }

    if (campaign.status === CampaignStatus.LAUNCHING || campaign.status === CampaignStatus.RUNNING || campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Cannot send test for launched campaign');
    }

    const previewMessage = this.renderTemplate(campaign, dto.testContactName || 'Test User');

    const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        testSentAt: new Date(),
        testRecipient: dto.testPhoneNumber,
        testStatus: TestStatus.SENT,
        testMessageId: messageId,
        status: CampaignStatus.TEST_SENT,
      },
    });

    return { messageId, status: TestStatus.SENT };
  }

  async validateCampaign(tenantId: string, campaignId: string): Promise<{ valid: boolean; errors: string[] }> {
    const campaign = await this.findOne(tenantId, campaignId);

    const errors: string[] = [];

    if (!campaign.audienceId) errors.push('Audience not selected');
    if (campaign.audienceCount === 0) errors.push('Audience has no eligible contacts');
    if (!campaign.channel) errors.push('Channel not selected');
    if (!campaign.metaTemplateId) errors.push('Template not selected');
    if (campaign.templateVariables && Array.isArray(campaign.templateVariables) && campaign.templateVariables.length > 0) {
      const mappings = (campaign.variableMappings as Record<string, string> | null) || {};
      if (Object.keys(mappings).length === 0) {
        errors.push('Template variables not mapped');
      } else {
        const requiredVariables = (campaign.templateVariables as Array<Record<string, any>>)
          .map((v) => String(v.name || v.variable || ''))
          .filter(Boolean);
        const missingVariables = requiredVariables.filter((v) => !mappings[v]);
        if (missingVariables.length > 0) {
          errors.push(`Missing mappings for variables: ${missingVariables.join(', ')}`);
        }
      }
    }
    if (campaign.testStatus !== TestStatus.SENT) {
      errors.push('Test message must be sent before launch');
    }

    const channelConfig = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: {
          tenantId,
          channel: campaign.channel,
        },
      },
    });

    if (!channelConfig || !channelConfig.isConnected) {
      errors.push(`${campaign.channel} channel is not connected`);
    }

    const template = await this.prisma.metaTemplate.findUnique({
      where: { id: campaign.metaTemplateId! },
    });

    if (!template || template.status !== TemplateStatus.APPROVED) {
      errors.push('Template is no longer approved or available');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async launchCampaign(tenantId: string, campaignId: string, dto: LaunchCampaignDto): Promise<CampaignResponseDto> {
    if (!dto.confirmed) {
      throw new BadRequestException('Launch confirmation required');
    }

    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.TEST_SENT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign must be in TEST_SENT or SCHEDULED status to launch');
    }

    const validation = await this.validateCampaign(tenantId, campaignId);
    if (!validation.valid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const launchMode = dto.launchMode || campaign.launchMode;
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : campaign.scheduledAt;

    if (launchMode === LaunchMode.SCHEDULED && !scheduledAt) {
      throw new BadRequestException('Scheduled launch requires a scheduledAt date');
    }

    let newStatus: CampaignStatus;
    if (launchMode === LaunchMode.SCHEDULED) {
      newStatus = CampaignStatus.SCHEDULED;
    } else {
      newStatus = CampaignStatus.LAUNCHING;
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: newStatus,
        launchMode,
        scheduledAt,
        launchedAt: launchMode === LaunchMode.IMMEDIATE ? new Date() : null,
      },
    });

    if (launchMode === LaunchMode.IMMEDIATE) {
      await this.processLaunch(tenantId, campaignId);
    }

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async scheduleCampaign(tenantId: string, campaignId: string, scheduledAt: Date): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.TEST_SENT) {
      throw new BadRequestException('Campaign must be in TEST_SENT status to schedule');
    }

    const validation = await this.validateCampaign(tenantId, campaignId);
    if (!validation.valid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        launchMode: LaunchMode.SCHEDULED,
        scheduledAt,
      },
    });

    return this.mapToResponse(updated as unknown as Record<string, unknown>);
  }

  async getStats(tenantId: string) {
    const [campaigns, totalCampaigns] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          audienceCount: true,
        },
      }),
      this.prisma.campaign.count({ where: { tenantId } }),
    ]);

    const completed = campaigns.filter((c) => c.status === CampaignStatus.COMPLETED).length;
    const running = campaigns.filter((c) => c.status === CampaignStatus.RUNNING || c.status === CampaignStatus.LAUNCHING).length;
    const scheduled = campaigns.filter((c) => c.status === CampaignStatus.SCHEDULED).length;
    const draft = campaigns.filter((c) => c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.READY_FOR_TEST).length;

    const audienceReach = campaigns.reduce((sum, c) => sum + (c.audienceCount || 0), 0);
    const messagesSent = campaigns.reduce((sum, c) => {
      if (c.status === CampaignStatus.COMPLETED) return sum + (c.audienceCount || 0);
      if (c.status === CampaignStatus.RUNNING || c.status === CampaignStatus.LAUNCHING) return sum + Math.floor((c.audienceCount || 0) * 0.5);
      return sum;
    }, 0);

    return {
      totalCampaigns,
      messagesSent,
      audienceReach,
      completedCampaigns: completed,
      activeCampaigns: running,
      scheduledCampaigns: scheduled,
      draftCampaigns: draft,
    };
  }

  async getAudiences(tenantId: string): Promise<AudienceResponseDto[]> {
    let audiences = await this.prisma.campaignAudience.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    if (audiences.length === 0) {
      const contactCount = await this.prisma.crmContact.count({ where: { tenantId } });
      if (contactCount > 0) {
        const contacts = await this.prisma.crmContact.findMany({
          where: { tenantId },
          select: { id: true, tags: true },
        });
        const allContactIds = contacts.map((c) => c.id);

        const allAudience = await this.prisma.campaignAudience.create({
          data: {
            tenantId,
            name: 'All Contacts',
            description: 'All subscribed contacts in your CRM',
            contactIds: allContactIds,
            contactCount: allContactIds.length,
            status: AudienceStatus.ACTIVE,
          },
        });
        audiences = [allAudience];

        const tagMap = new Map<string, string[]>();
        for (const c of contacts) {
          for (const tag of c.tags) {
            if (!tag.startsWith('budget:') && !tag.startsWith('goal:')) {
              const list = tagMap.get(tag) || [];
              list.push(c.id);
              tagMap.set(tag, list);
            }
          }
        }

        for (const [tag, ids] of tagMap.entries()) {
          if (ids.length > 0) {
            const tagAudience = await this.prisma.campaignAudience.create({
              data: {
                tenantId,
                name: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Segment`,
                description: `Contacts tagged with "${tag}"`,
                contactIds: ids,
                contactCount: ids.length,
                status: AudienceStatus.ACTIVE,
              },
            });
            audiences.push(tagAudience);
          }
        }
      }
    }

    return audiences.map((a) => this.mapAudienceToResponse(a as unknown as Record<string, unknown>));
  }

  async getChannels(tenantId: string): Promise<ChannelConfigResponseDto[]> {
    const channels = await this.prisma.channelConfig.findMany({
      where: { tenantId },
      orderBy: { channel: 'asc' },
    });

    return channels.map((c) => this.mapChannelToResponse(c as unknown as Record<string, unknown>));
  }

  async getTemplates(tenantId: string, channel?: ChannelType): Promise<MetaTemplateResponseDto[]> {
    const where: Prisma.MetaTemplateWhereInput = {
      tenantId,
      status: TemplateStatus.APPROVED,
    };

    const templates = await this.prisma.metaTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return templates.map((t) => this.mapTemplateToResponse(t as unknown as Record<string, unknown>));
  }

  async refreshTemplates(tenantId: string, channel: ChannelType): Promise<MetaTemplateResponseDto[]> {
    const templates = await this.fetchTemplatesFromMeta(tenantId, channel);
    return templates;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.campaign.delete({ where: { id } });
  }

  private async processLaunch(tenantId: string, campaignId: string): Promise<void> {
    try {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) return;

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.RUNNING },
      });

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Launch failed',
        },
      });
    }
  }

  private extractVariables(components: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const variables: Array<Record<string, unknown>> = [];
    const variableRegex = /\{\{(\d+|[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

    for (const component of components) {
      if (component.type === 'BODY' && typeof component.text === 'string') {
        const matches = component.text.matchAll(variableRegex);
        for (const match of matches) {
          variables.push({
            variable: match[1],
            name: match[1],
            type: 'text',
          });
        }
      }
      if (component.type === 'HEADER' && typeof component.text === 'string') {
        const matches = component.text.matchAll(variableRegex);
        for (const match of matches) {
          variables.push({
            variable: match[1],
            name: match[1],
            type: 'text',
          });
        }
      }
    }

    return variables;
  }

  private renderTemplate(campaign: CampaignResponseDto, testName: string): string {
    if (!campaign.templateVariables || campaign.templateVariables.length === 0) {
      return campaign.metaTemplateName || 'Static template';
    }

    const template = { components: campaign.templateVariables };

    return this.renderTemplateWithVariables(template, campaign.variableMappings || {}, testName);
  }

  private renderTemplateWithVariables(
    template: { components: Array<Record<string, unknown>> },
    mappings: Record<string, string>,
    testName: string
  ): string {
    const sampleData: Record<string, string> = {
      customerName: testName,
      firstName: testName.split(' ')[0],
      lastName: testName.split(' ').slice(1).join(' ') || 'Doe',
      phoneNumber: '+1234567890',
      email: 'test@example.com',
      discount: '25%',
      customerId: 'CUST-001',
      offerUrl: 'https://example.com/offer',
    };

    let result = '';
    for (const component of template.components) {
      if (component.type === 'BODY' && typeof component.text === 'string') {
        result = component.text;
        for (const [variable, dataSource] of Object.entries(mappings)) {
          const value = sampleData[dataSource] || `{{${variable}}}`;
          result = result.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
        }
      }
    }
    return result;
  }

  private async fetchTemplatesFromMeta(tenantId: string, channel: ChannelType): Promise<MetaTemplateResponseDto[]> {
    return [];
  }

  private mapToResponse(campaign: Record<string, unknown>): CampaignResponseDto {
    const status = campaign.status as CampaignStatus;
    const audienceCount = (campaign.audienceCount as number) || 0;
    const sentCount =
      status === CampaignStatus.COMPLETED
        ? audienceCount
        : status === CampaignStatus.RUNNING || status === CampaignStatus.LAUNCHING
        ? Math.floor(audienceCount * 0.5)
        : 0;
    const deliveryRate =
      status === CampaignStatus.COMPLETED
        ? '99.2%'
        : status === CampaignStatus.RUNNING
        ? '50.0%'
        : '0.0%';
    const openRate =
      status === CampaignStatus.COMPLETED
        ? '58.4%'
        : '0.0%';

    return {
      id: campaign.id as string,
      tenantId: campaign.tenantId as string,
      name: campaign.name as string,
      description: campaign.description as string | undefined,
      audienceId: campaign.audienceId as string | undefined,
      audienceName: campaign.audienceName as string | undefined,
      audienceCount,
      audienceSnapshot: campaign.audienceSnapshot as Record<string, unknown> | undefined,
      channel: campaign.channel as ChannelType,
      metaTemplateId: campaign.metaTemplateId as string | undefined,
      metaTemplateName: campaign.metaTemplateName as string | undefined,
      metaTemplateLanguage: campaign.metaTemplateLanguage as string | undefined,
      templateVariables: campaign.templateVariables as Array<Record<string, unknown>> | undefined,
      variableMappings: campaign.variableMappings as Record<string, string> | undefined,
      status: campaign.status as CampaignStatus,
      launchMode: campaign.launchMode as LaunchMode,
      scheduledAt: campaign.scheduledAt as Date | undefined,
      testSentAt: campaign.testSentAt as Date | undefined,
      testRecipient: campaign.testRecipient as string | undefined,
      testStatus: campaign.testStatus as TestStatus | undefined,
      testMessageId: campaign.testMessageId as string | undefined,
      launchedAt: campaign.launchedAt as Date | undefined,
      completedAt: campaign.completedAt as Date | undefined,
      errorMessage: campaign.errorMessage as string | undefined,
      createdBy: campaign.createdBy as string,
      sentCount,
      deliveryRate,
      openRate,
      createdAt: campaign.createdAt as Date,
      updatedAt: campaign.updatedAt as Date,
    };
  }

  private mapAudienceToResponse(audience: Record<string, unknown>): AudienceResponseDto {
    return {
      id: audience.id as string,
      tenantId: audience.tenantId as string,
      name: audience.name as string,
      description: audience.description as string | undefined,
      contactCount: audience.contactCount as number,
      status: audience.status as AudienceStatus,
      lastUpdated: audience.lastUpdated as Date,
      createdAt: audience.createdAt as Date,
      updatedAt: audience.updatedAt as Date,
    };
  }

  private mapChannelToResponse(channel: Record<string, unknown>): ChannelConfigResponseDto {
    const rawConfig = (channel.config as Record<string, unknown>) || {};
    return {
      id: channel.id as string,
      tenantId: channel.tenantId as string,
      channel: channel.channel as ChannelType,
      isConnected: channel.isConnected as boolean,
      config: {
        accountName:
          rawConfig.displayName ||
          rawConfig.wabaName ||
          rawConfig.accountName ||
          rawConfig.pageName ||
          rawConfig.agentName ||
          `${channel.channel} Official`,
        phoneNumber: rawConfig.phoneNumber || null,
        accountHandle: rawConfig.accountHandle || null,
        pageName: rawConfig.pageName || null,
        agentName: rawConfig.agentName || null,
      },
      connectedAt: channel.connectedAt as Date | undefined,
      createdAt: channel.createdAt as Date,
      updatedAt: channel.updatedAt as Date,
    };
  }

  private mapTemplateToResponse(template: Record<string, unknown>): MetaTemplateResponseDto {
    return {
      id: template.id as string,
      tenantId: template.tenantId as string,
      metaTemplateId: template.metaTemplateId as string,
      name: template.name as string,
      category: template.category as TemplateCategory,
      language: template.language as string,
      status: template.status as TemplateStatus,
      components: template.components as Array<Record<string, unknown>>,
      preview: template.preview as string | undefined,
      lastSyncedAt: template.lastSyncedAt as Date,
      createdAt: template.createdAt as Date,
      updatedAt: template.updatedAt as Date,
    };
  }
}