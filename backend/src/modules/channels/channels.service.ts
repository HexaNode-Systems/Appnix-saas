import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  ConnectChannelDto,
  MetaEmbeddedSignupDto,
  CreateRcsTemplateDto,
  UpdateRcsTemplateDto,
  ConnectFacebookPageDto,
  FacebookOAuthExchangeDto,
} from './dto/channels.dto';
import { encryptPayload, decryptPayload } from '../../common/utils/encryption.util';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get metaAppId(): string {
    return (
      this.configService.get<string>('META_APP_ID') ||
      process.env.META_APP_ID ||
      '1320704840107894'
    );
  }

  private get metaAppSecret(): string {
    return (
      this.configService.get<string>('META_APP_SECRET') ||
      process.env.META_APP_SECRET ||
      '2b70a4ffb53fd2dbfa7d4213432400ae'
    );
  }

  private get metaApiVersion(): string {
    return (
      this.configService.get<string>('META_GRAPH_API_VERSION') ||
      process.env.META_GRAPH_API_VERSION ||
      'v21.0'
    );
  }

  // ----------------- CHANNELS OVERVIEW & CONNECTION -----------------

  async getAllChannels(tenantId: string) {
    const channelConfigs = await this.prisma.channelConfig.findMany({
      where: { tenantId, isConnected: true },
    });

    const data = channelConfigs.map((found) => {
      const conf = (found.config as any) || {};
      const type = found.channel;

      if (type === 'WHATSAPP') {
        return {
          id: found.id,
          name: conf.displayName || conf.wabaName || 'WhatsApp Cloud API',
          subtitle: conf.phoneNumber || (conf.wabaId ? `WABA: ${conf.wabaId}` : 'WhatsApp Business'),
          type: 'whatsapp',
          status: 'connected',
          phoneNumber: conf.phoneNumber || null,
          wabaId: conf.wabaId || null,
          phoneNumberId: conf.phoneNumberId || null,
          businessId: conf.businessId || null,
          qualityRating: conf.qualityRating || null,
          messagingLimitTier: conf.messagingLimitTier || null,
          codeVerificationStatus: conf.codeVerificationStatus || null,
          accountReviewStatus: conf.accountReviewStatus || null,
          webhookSubscribed: conf.webhookSubscribed ?? true,
          webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/whatsapp`,
          connectedAt: found.connectedAt,
          lastVerifiedAt: found.lastVerifiedAt,
        };
      }

      if (type === 'INSTAGRAM') {
        return {
          id: found.id,
          name: conf.accountName || conf.name || (conf.accountHandle ? (conf.accountHandle.startsWith('@') ? conf.accountHandle : `@${conf.accountHandle}`) : 'Instagram Professional'),
          subtitle: conf.accountHandle ? (conf.accountHandle.startsWith('@') ? conf.accountHandle : `@${conf.accountHandle}`) : (conf.pageId ? `Page ID: ${conf.pageId}` : 'Instagram Channel'),
          type: 'instagram',
          status: 'connected',
          accountHandle: conf.accountHandle || null,
          pageId: conf.pageId || null,
          autoReplyEnabled: conf.autoReplyEnabled,
          webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/instagram`,
          connectedAt: found.connectedAt,
          lastVerifiedAt: found.lastVerifiedAt,
        };
      }

      if (type === 'FACEBOOK') {
        return {
          id: found.id,
          name: conf.pageName || conf.name || 'Facebook Page',
          subtitle: conf.pageId ? `Page ID: ${conf.pageId}` : (conf.subtitle || 'Facebook Channel'),
          type: 'facebook',
          status: 'connected',
          pageName: conf.pageName || null,
          pageId: conf.pageId || null,
          category: conf.category || null,
          avatarUrl: conf.avatarUrl || null,
          colorCode: conf.colorCode || '#4F46E5',
          botEnabled: conf.botEnabled,
          welcomeMessage: conf.welcomeMessage || null,
          webhookSubscribed: conf.webhookSubscribed ?? true,
          webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/facebook`,
          connectedAt: found.connectedAt,
          lastVerifiedAt: found.lastVerifiedAt,
        };
      }

      // RCS
      return {
        id: found.id,
        name: conf.agentName || conf.name || 'Google RCS Agent',
        subtitle: conf.agentId ? `Agent: ${conf.agentId}` : 'RCS Channel',
        type: 'rcs',
        status: 'connected',
        agentName: conf.agentName || null,
        agentId: conf.agentId || null,
        carriers: conf.carriers || null,
        throughput: conf.throughput || null,
        webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/rcs`,
        connectedAt: found.connectedAt,
        lastVerifiedAt: found.lastVerifiedAt,
      };
    });

    return {
      success: true,
      data,
    };
  }

  async connectChannel(tenantId: string, dto: ConnectChannelDto) {
    const channelEnum = String(dto.channel).toUpperCase() as any;
    const config = await this.prisma.channelConfig.upsert({
      where: {
        tenantId_channel: { tenantId, channel: channelEnum },
      },
      create: {
        tenantId,
        channel: channelEnum,
        isConnected: true,
        config: dto.config || {},
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
      update: {
        isConnected: true,
        config: dto.config || {},
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
    });

    // Log Activity
    await this.prisma.activityLog.create({
      data: {
        tenantId,
        action: `Connected ${dto.channel} communication channel`,
        module: 'Channels',
        status: 'Success',
      },
    });

    return {
      success: true,
      data: config,
      message: `${dto.channel} connected successfully`,
    };
  }

  async disconnectChannel(tenantId: string, channel: string) {
    const channelEnum = String(channel).toUpperCase() as any;
    const config = await this.prisma.channelConfig.update({
      where: {
        tenantId_channel: { tenantId, channel: channelEnum },
      },
      data: {
        isConnected: false,
      },
    }).catch(() => null);

    if (channelEnum === 'INSTAGRAM') {
      await this.prisma.instagramChannel.updateMany({
        where: { tenantId },
        data: { status: 'DISCONNECTED' },
      }).catch(() => null);
    }

    // Log Activity
    if (config) {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          action: `Disconnected ${channel} communication channel`,
          module: 'Channels',
          status: 'Warning',
        },
      });
    }

    return {
      success: true,
      data: config,
      message: `${channel} disconnected`,
    };
  }

  // ----------------- META EMBEDDED SIGNUP & WHATSAPP ONBOARDING -----------------

  getPublicMetaConfig() {
    const appId = this.configService.get<string>('META_APP_ID') || '';
    const configId = this.configService.get<string>('META_EMBEDDED_SIGNUP_CONFIG_ID') || '';
    const graphVersion = this.configService.get<string>('META_GRAPH_API_VERSION') || 'v21.0';

    const isAppIdConfigured = Boolean(appId && appId !== 'your_meta_app_id');
    const isConfigIdConfigured = Boolean(configId && configId !== 'your_meta_embedded_signup_config_id');

    return {
      success: true,
      data: {
        appId: isAppIdConfigured ? appId : '',
        configId: isConfigIdConfigured ? configId : '',
        graphVersion,
        isConfigured: isAppIdConfigured && isConfigIdConfigured,
      },
    };
  }

  async handleMetaEmbeddedSignup(tenantId: string, dto: MetaEmbeddedSignupDto) {
    const rawAppId = this.configService.get<string>('META_APP_ID');
    const rawAppSecret = this.configService.get<string>('META_APP_SECRET');
    const graphVersion = this.configService.get<string>('META_GRAPH_API_VERSION') || 'v21.0';

    if (!dto.code || typeof dto.code !== 'string') {
      throw new BadRequestException('Meta authorization code is required for Embedded Signup.');
    }

    if (!rawAppId || !rawAppSecret || rawAppId === 'your_meta_app_id' || rawAppSecret === 'your_meta_app_secret') {
      throw new BadRequestException(
        'Meta App credentials (META_APP_ID and META_APP_SECRET) are not configured in backend environment. Please configure them in backend/.env to verify and register WhatsApp Business accounts.',
      );
    }

    const appId = rawAppId.replace(/^["']|["']$/g, '').trim();
    const appSecret = rawAppSecret.replace(/^["']|["']$/g, '').trim();

    let wabaId = dto.wabaId ? String(dto.wabaId).trim() : null;
    let phoneNumberId = dto.phoneNumberId ? String(dto.phoneNumberId).trim() : null;
    let businessId = dto.businessId ? String(dto.businessId).trim() : null;
    let wabaName = 'WhatsApp Business Account';
    let phoneNumber: string | null = null;
    let displayName = 'WhatsApp Business';
    let qualityRating = 'UNKNOWN';
    let messagingLimitTier = 'TIER_50';
    let codeVerificationStatus: string | null = null;
    let nameStatus: string | null = null;
    let currency: string | null = null;
    let timezoneId: string | null = null;
    let accountReviewStatus: string | null = null;
    let messageTemplateNamespace: string | null = null;
    let rawAccessToken = '';
    let webhookSubscribed = false;

    try {
      // Step 1: Exchange code for long-lived system user access token
      const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(dto.code)}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        this.logger.error(`Meta token exchange failed: ${JSON.stringify(tokenData)}`);
        const metaError = tokenData.error || {};
        const metaMsg = metaError.message || 'Failed to exchange Meta authorization code with Graph API.';
        const errSubcode = metaError.error_subcode ? ` (Subcode: ${metaError.error_subcode})` : '';
        throw new BadRequestException(`Meta Graph API token exchange error: ${metaMsg}${errSubcode}`);
      }

      rawAccessToken = tokenData.access_token;

      // Step 2: Debug token to get WABA ID & Business ID if not provided in callback
      if (!wabaId || !businessId) {
        try {
          const debugUrl = `https://graph.facebook.com/${graphVersion}/debug_token?input_token=${encodeURIComponent(rawAccessToken)}&access_token=${encodeURIComponent(appId)}|${encodeURIComponent(appSecret)}`;
          const debugRes = await fetch(debugUrl);
          const debugData = await debugRes.json();

          if (debugData.data?.business_id && !businessId) {
            businessId = String(debugData.data.business_id);
          }

          if (!wabaId) {
            const granularScopes = debugData.data?.granular_scopes || [];
            const waScope = granularScopes.find(
              (s: any) =>
                s.scope === 'whatsapp_business_management' ||
                s.scope === 'whatsapp_business_messaging',
            );
            if (waScope?.target_ids && waScope.target_ids.length > 0) {
              wabaId = String(waScope.target_ids[0]);
            } else if (debugData.data?.target_ids && debugData.data.target_ids.length > 0) {
              wabaId = String(debugData.data.target_ids[0]);
            }
          }
        } catch (debugErr: any) {
          this.logger.warn(`debug_token inspection warning: ${debugErr.message}`);
        }
      }

      // Step 2b: Fallback to owned/client WABAs if wabaId is still not found
      if (!wabaId && businessId) {
        try {
          const ownedWabaUrl = `https://graph.facebook.com/${graphVersion}/${businessId}/owned_whatsapp_business_accounts?access_token=${encodeURIComponent(rawAccessToken)}`;
          const ownedRes = await fetch(ownedWabaUrl);
          if (ownedRes.ok) {
            const ownedJson = await ownedRes.json();
            if (ownedJson.data && ownedJson.data.length > 0) {
              wabaId = String(ownedJson.data[0].id);
            }
          }

          if (!wabaId) {
            const clientWabaUrl = `https://graph.facebook.com/${graphVersion}/${businessId}/client_whatsapp_business_accounts?access_token=${encodeURIComponent(rawAccessToken)}`;
            const clientRes = await fetch(clientWabaUrl);
            if (clientRes.ok) {
              const clientJson = await clientRes.json();
              if (clientJson.data && clientJson.data.length > 0) {
                wabaId = String(clientJson.data[0].id);
              }
            }
          }
        } catch (bizErr: any) {
          this.logger.warn(`Business WABA lookup warning: ${bizErr.message}`);
        }
      }

      // Step 3: Fetch verified WABA details
      if (wabaId) {
        try {
          const wabaUrl = `https://graph.facebook.com/${graphVersion}/${wabaId}?fields=id,name,currency,timezone_id,account_review_status,message_template_namespace&access_token=${encodeURIComponent(rawAccessToken)}`;
          const wabaRes = await fetch(wabaUrl);
          if (wabaRes.ok) {
            const wabaJson = await wabaRes.json();
            wabaName = wabaJson.name || wabaName;
            currency = wabaJson.currency || null;
            timezoneId = wabaJson.timezone_id || null;
            accountReviewStatus = wabaJson.account_review_status || null;
            messageTemplateNamespace = wabaJson.message_template_namespace || null;
          }
        } catch (wabaErr: any) {
          this.logger.warn(`WABA details fetch warning: ${wabaErr.message}`);
        }

        // Step 4: Fetch verified Phone Numbers for WABA
        if (phoneNumberId) {
          try {
            const phoneUrl = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,name_status&access_token=${encodeURIComponent(rawAccessToken)}`;
            const phoneRes = await fetch(phoneUrl);
            if (phoneRes.ok) {
              const phoneJson = await phoneRes.json();
              phoneNumber = phoneJson.display_phone_number || null;
              displayName = phoneJson.verified_name || wabaName;
              qualityRating = phoneJson.quality_rating || qualityRating;
              messagingLimitTier = phoneJson.messaging_limit_tier || messagingLimitTier;
              codeVerificationStatus = phoneJson.code_verification_status || null;
              nameStatus = phoneJson.name_status || null;
            }
          } catch (phoneErr: any) {
            this.logger.warn(`Phone number ID fetch warning: ${phoneErr.message}`);
          }
        }

        if (!phoneNumber) {
          try {
            const phoneUrl = `https://graph.facebook.com/${graphVersion}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,name_status&access_token=${encodeURIComponent(rawAccessToken)}`;
            const phoneRes = await fetch(phoneUrl);
            if (phoneRes.ok) {
              const phoneJson = await phoneRes.json();
              const primaryPhone = phoneJson.data?.[0];
              if (primaryPhone) {
                phoneNumberId = primaryPhone.id;
                phoneNumber = primaryPhone.display_phone_number || null;
                displayName = primaryPhone.verified_name || displayName;
                qualityRating = primaryPhone.quality_rating || qualityRating;
                messagingLimitTier = primaryPhone.messaging_limit_tier || messagingLimitTier;
                codeVerificationStatus = primaryPhone.code_verification_status || null;
                nameStatus = primaryPhone.name_status || null;
              }
            }
          } catch (phoneListErr: any) {
            this.logger.warn(`Phone numbers list fetch warning: ${phoneListErr.message}`);
          }
        }

        // Step 5: Subscribe app to WABA webhooks
        try {
          const subUrl = `https://graph.facebook.com/${graphVersion}/${wabaId}/subscribed_apps`;
          const subRes = await fetch(subUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${rawAccessToken}` },
          });
          const subJson = await subRes.json().catch(() => ({}));
          webhookSubscribed = subRes.ok && (subJson.success === true || subJson.data?.[0]?.success === true || subRes.status === 200);
        } catch (subErr: any) {
          this.logger.warn(`Webhook subscription request warning: ${subErr.message}`);
        }
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`Meta Embedded Signup server verification failed: ${err.message}`, err.stack);
      throw new BadRequestException(`Meta Graph API verification failed: ${err.message}`);
    }

    // Step 6: Prevent duplicate active phone numbers across workspaces
    if (phoneNumberId || phoneNumber) {
      const existingOtherTenants = await this.prisma.channelConfig.findMany({
        where: {
          channel: 'WHATSAPP',
          isConnected: true,
          tenantId: { not: tenantId },
        },
        select: { id: true, tenantId: true, config: true },
      });

      const duplicate = existingOtherTenants.find((c) => {
        const conf = (c.config as any) || {};
        const confPhoneId = conf.phoneNumberId;
        const confPhone = conf.phoneNumber;
        if (phoneNumberId && confPhoneId && String(confPhoneId).trim() === String(phoneNumberId).trim()) return true;
        if (phoneNumber && confPhone && String(confPhone).trim() === String(phoneNumber).trim()) return true;
        return false;
      });

      if (duplicate) {
        throw new BadRequestException(
          `The WhatsApp phone number (${phoneNumber || phoneNumberId}) is already actively registered with another workspace. Each phone number can only be connected to one workspace at a time. Please disconnect it from the other workspace first.`,
        );
      }
    }

    // Step 7: Encrypt the Access Token using AES-256-GCM
    const encryptedToken = encryptPayload(rawAccessToken);

    const configPayload = {
      wabaId: wabaId || undefined,
      wabaName,
      phoneNumberId: phoneNumberId || undefined,
      phoneNumber: phoneNumber || undefined,
      displayName: displayName || wabaName,
      businessId: businessId || undefined,
      qualityRating,
      messagingLimitTier,
      codeVerificationStatus,
      nameStatus,
      currency,
      timezoneId,
      accountReviewStatus,
      messageTemplateNamespace,
      encryptedAccessToken: encryptedToken,
      webhookSubscribed,
      onboardingMethod: 'EMBEDDED_SIGNUP',
    };

    // Step 8: Persist verified ChannelConfig in PostgreSQL
    const channelConfig = await this.prisma.channelConfig.upsert({
      where: {
        tenantId_channel: { tenantId, channel: 'WHATSAPP' },
      },
      create: {
        tenantId,
        channel: 'WHATSAPP',
        isConnected: true,
        config: configPayload,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
      update: {
        isConnected: true,
        config: configPayload,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
    });

    // Step 9: Log Audit Trail
    await this.prisma.activityLog.create({
      data: {
        tenantId,
        action: `Connected WhatsApp Cloud API via Meta Embedded Signup (${phoneNumber || displayName}, WABA: ${wabaId || 'N/A'})`,
        module: 'Channels > WhatsApp',
        status: 'Success',
      },
    });

    return {
      success: true,
      data: {
        channelId: channelConfig.id,
        channel: 'WHATSAPP',
        status: 'CONNECTED',
        wabaId,
        wabaName,
        phoneNumberId,
        phoneNumber,
        displayName,
        qualityRating,
        messagingLimitTier,
        webhookSubscribed,
        connectedAt: channelConfig.connectedAt,
      },
      message: `WhatsApp Business Account (${phoneNumber || displayName}) connected and verified successfully!`,
    };
  }

  async getWhatsAppStatus(tenantId: string) {
    const config = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: { tenantId, channel: 'WHATSAPP' },
      },
    });

    if (!config || !config.isConnected) {
      return {
        success: true,
        data: {
          channel: 'WHATSAPP',
          status: 'DISCONNECTED',
          isConnected: false,
          webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/whatsapp`,
        },
      };
    }

    const conf = (config.config as any) || {};

    return {
      success: true,
      data: {
        channelId: config.id,
        channel: 'WHATSAPP',
        status: 'CONNECTED',
        isConnected: true,
        wabaId: conf.wabaId || null,
        wabaName: conf.wabaName || 'WhatsApp Business Account',
        phoneNumberId: conf.phoneNumberId || null,
        phoneNumber: conf.phoneNumber || null,
        displayName: conf.displayName || null,
        qualityRating: conf.qualityRating || null,
        messagingLimitTier: conf.messagingLimitTier || null,
        webhookSubscribed: conf.webhookSubscribed ?? true,
        webhookUrl: `https://api.appnix.co.in/api/v1/webhooks/whatsapp`,
        connectedAt: config.connectedAt,
        lastVerifiedAt: config.lastVerifiedAt,
      },
    };
  }

  // ----------------- CHANNEL BALANCE & TRANSACTIONS -----------------

  async getChannelBalance(tenantId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { tenantId } });
    const currentBalance = wallet?.balance || 0;

    const txns = await this.prisma.channelTransaction.findMany({
      where: { tenantId },
    });

    const totalSpend = txns.filter((t) => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
    const totalUnits = txns.reduce((sum, t) => sum + (t.unitCount || 1), 0);
    const averageCostPerUnit = totalUnits > 0 ? totalSpend / totalUnits : 0.78;
    const creditsAdded = txns.filter((t) => t.type === 'CREDIT' || t.type === 'TOPUP').reduce((sum, t) => sum + t.amount, 0);
    const refundsCount = txns.filter((t) => t.type === 'REFUND').length;

    const waConfig = await this.prisma.channelConfig.findUnique({
      where: { tenantId_channel: { tenantId, channel: 'WHATSAPP' } },
    });
    const waData = (waConfig?.config as any) || {};
    const isWaConnected = Boolean(waConfig?.isConnected);

    return {
      success: true,
      data: {
        accountDetails: {
          id: waConfig?.id || 'waba-primary',
          name: waData.displayName || waData.wabaName || (isWaConnected ? 'WhatsApp Business' : 'No WhatsApp Channel Connected'),
          phoneNumber: waData.phoneNumber || (isWaConnected ? 'Connected' : 'Not Configured'),
          channelType: 'WhatsApp Cloud API',
          wabaId: waData.wabaId || null,
          status: isWaConnected ? 'connected' : 'disconnected',
          qualityScore: waData.qualityRating || (isWaConnected ? 'UNKNOWN' : 'N/A'),
          currentBalance,
          currency: wallet?.currency || 'INR',
          lastSyncedAt: new Date().toISOString(),
          minThreshold: wallet?.minThreshold || 500,
          autoRechargeEnabled: wallet?.autoRechargeEnabled || false,
        },
        summaryMetrics: {
          totalSpend,
          totalUnits,
          averageCostPerUnit: parseFloat(averageCostPerUnit.toFixed(2)),
          creditsAdded,
          refundsCount,
        },
      },
    };
  }

  async getChannelTransactions(tenantId: string) {
    const txns = await this.prisma.channelTransaction.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: txns,
    };
  }

  async getChannelStatistics(tenantId: string) {
    const messages = await this.prisma.message.findMany({
      where: { tenantId },
      select: { status: true },
    });

    const total = messages.length;
    const delivered = messages.filter((m) => m.status === 'delivered' || m.status === 'read').length;
    const read = messages.filter((m) => m.status === 'read').length;

    const whatsapp = await this.prisma.conversation.count({ where: { tenantId, channel: 'whatsapp' } });
    const rcs = await this.prisma.conversation.count({ where: { tenantId, channel: 'rcs' } });
    const instagram = await this.prisma.conversation.count({ where: { tenantId, channel: 'instagram' } });
    const facebook = await this.prisma.conversation.count({ where: { tenantId, channel: 'facebook' } });
    const sum = whatsapp + rcs + instagram + facebook || 1;

    return {
      success: true,
      data: {
        totalDispatched: total,
        deliveryRate: total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : '0.0%',
        readRate: total > 0 ? `${((read / total) * 100).toFixed(1)}%` : '0.0%',
        avgLatencyMs: 340,
        channelShare: {
          whatsapp: `${Math.round((whatsapp / sum) * 100)}%`,
          rcs: `${Math.round((rcs / sum) * 100)}%`,
          instagram: `${Math.round((instagram / sum) * 100)}%`,
          facebook: `${Math.round((facebook / sum) * 100)}%`,
        },
      },
    };
  }

  // ----------------- RCS TEMPLATES -----------------

  async getRcsTemplates(tenantId: string) {
    const templates = await this.prisma.rcsTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: templates,
    };
  }

  async getRcsTemplateById(tenantId: string, id: string) {
    const template = await this.prisma.rcsTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('RCS Template not found');
    return { success: true, data: template };
  }

  async createRcsTemplate(tenantId: string, dto: CreateRcsTemplateDto) {
    const template = await this.prisma.rcsTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        category: dto.category || 'PROMOTIONAL',
        messageType: dto.messageType || 'RICH_CARD',
        textBody: dto.textBody,
        standaloneActions: dto.standaloneActions || [],
        card: dto.card || {},
        cards: dto.cards || [],
        variables: dto.variables || [],
        variableMappings: dto.variableMappings || {},
        status: 'DRAFT',
      },
    });

    return { success: true, data: template };
  }

  async updateRcsTemplate(tenantId: string, id: string, dto: UpdateRcsTemplateDto) {
    await this.getRcsTemplateById(tenantId, id);

    const template = await this.prisma.rcsTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.category && { category: dto.category }),
        ...(dto.messageType && { messageType: dto.messageType }),
        ...(dto.textBody !== undefined && { textBody: dto.textBody }),
        ...(dto.standaloneActions !== undefined && { standaloneActions: dto.standaloneActions }),
        ...(dto.card !== undefined && { card: dto.card }),
        ...(dto.cards !== undefined && { cards: dto.cards }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
        ...(dto.variableMappings !== undefined && { variableMappings: dto.variableMappings }),
      },
    });

    return { success: true, data: template };
  }

  async submitRcsTemplateForApproval(tenantId: string, id: string) {
    await this.getRcsTemplateById(tenantId, id);

    const updated = await this.prisma.rcsTemplate.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
        carrierApprovals: [
          { carrier: 'Jio', status: 'PENDING', submittedAt: new Date().toISOString() },
          { carrier: 'Airtel', status: 'PENDING', submittedAt: new Date().toISOString() },
          { carrier: 'Vodafone Idea', status: 'PENDING', submittedAt: new Date().toISOString() },
        ],
      },
    });

    return {
      success: true,
      data: updated,
      message: 'RCS Template submitted for telecom carrier compliance review',
    };
  }

  async deleteRcsTemplate(tenantId: string, id: string) {
    await this.getRcsTemplateById(tenantId, id);
    await this.prisma.rcsTemplate.delete({ where: { id } });
    return { success: true, message: 'RCS Template deleted successfully' };
  }

  // ----------------- FACEBOOK PAGE & MESSENGER INTEGRATION -----------------

  getFacebookOAuthUrl(
    tenantId: string,
    customRedirectUri?: string,
    customConfigId?: string,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const redirectUri =
      customRedirectUri || `${frontendUrl}/channels/facebook/callback`;

    const statePayload = {
      tenantId,
      timestamp: Date.now(),
      channel: 'FACEBOOK',
      nonce: crypto.randomBytes(12).toString('hex'),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const configId =
      customConfigId?.trim() ||
      this.configService.get<string>('META_FACEBOOK_CONFIG_ID')?.trim() ||
      process.env.META_FACEBOOK_CONFIG_ID?.trim();

    let oauthUrl: string;
    if (configId) {
      // Facebook Login for Business with Configuration ID (no scope parameter per Meta specification)
      oauthUrl = `https://www.facebook.com/${this.metaApiVersion}/dialog/oauth?client_id=${
        this.metaAppId
      }&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&config_id=${encodeURIComponent(configId)}&response_type=code&state=${state}`;
    } else {
      const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
      ];

      oauthUrl = `https://www.facebook.com/${this.metaApiVersion}/dialog/oauth?client_id=${
        this.metaAppId
      }&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&scope=${scopes.join(',')}&response_type=code&state=${state}`;
    }

    return {
      success: true,
      data: {
        oauthUrl,
        state,
        appId: this.metaAppId,
        redirectUri,
        configId: configId || null,
      },
    };
  }

  async exchangeFacebookOAuthCode(
    tenantId: string,
    code: string,
    redirectUri?: string,
  ) {
    this.logger.log(`Exchanging Meta OAuth code for Facebook Pages (tenant: ${tenantId})...`);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const rUri = redirectUri || `${frontendUrl}/channels/facebook/callback`;

    // Step 1: Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/${this.metaApiVersion}/oauth/access_token?client_id=${
      this.metaAppId
    }&client_secret=${this.metaAppSecret}&redirect_uri=${encodeURIComponent(
      rUri,
    )}&code=${encodeURIComponent(code)}`;

    const shortTokenRes = await fetch(tokenUrl);
    const shortTokenData = await shortTokenRes.json();

    if (!shortTokenRes.ok || shortTokenData.error) {
      const errMsg =
        shortTokenData.error?.message ||
        'Failed to exchange authorization code with Meta Graph API';
      this.logger.error(`Meta OAuth short-lived token error: ${errMsg}`);
      throw new BadRequestException(errMsg);
    }

    const shortLivedToken = shortTokenData.access_token;

    // Step 2: Exchange short-lived token for long-lived user access token (60 days)
    const longTokenUrl = `https://graph.facebook.com/${this.metaApiVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${
      this.metaAppId
    }&client_secret=${this.metaAppSecret}&fb_exchange_token=${shortLivedToken}`;

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    const longLivedUserToken = longTokenData.access_token || shortLivedToken;

    // Step 3: Fetch Meta User Profile
    let userProfile = {
      id: 'fb_user',
      name: 'Facebook User',
      email: '',
      avatarUrl: '',
      connectedAt: new Date().toISOString(),
    };

    try {
      const meUrl = `https://graph.facebook.com/${this.metaApiVersion}/me?fields=id,name,email,picture{url}&access_token=${longLivedUserToken}`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json();
      if (meData?.id) {
        userProfile = {
          id: meData.id,
          name: meData.name || 'Facebook User',
          email: meData.email || '',
          avatarUrl: meData.picture?.data?.url || '',
          connectedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      this.logger.warn(`Could not fetch Facebook user profile: ${e}`);
    }

    // Step 4: Fetch User's Facebook Pages
    const pagesUrl = `https://graph.facebook.com/${this.metaApiVersion}/me/accounts?fields=id,name,access_token,category,picture{url},fan_count,followers_count,tasks&access_token=${longLivedUserToken}`;

    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok || pagesData.error) {
      const errMsg =
        pagesData.error?.message || 'Failed to fetch Facebook Pages from Meta API';
      this.logger.error(`Meta Pages query error: ${errMsg}`);
      throw new BadRequestException(errMsg);
    }

    // Check currently connected Page for this tenant
    const currentConfig = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: { tenantId, channel: 'FACEBOOK' },
      },
    });

    const connectedPageId = currentConfig?.isConnected
      ? (currentConfig.config as any)?.pageId
      : null;

    const rawPages = pagesData.data || [];
    const availablePages = rawPages.map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category || 'Business & Brand',
      avatarUrl:
        page.picture?.data?.url ||
        `https://graph.facebook.com/${this.metaApiVersion}/${page.id}/picture?type=normal`,
      followerCount: page.followers_count || page.fan_count || 0,
      likesCount: page.fan_count || 0,
      hasAdminPermission: true,
      isConnectedToCurrentWorkspace: Boolean(connectedPageId === page.id),
      isConnectedToOtherWorkspace: false,
      accessTokenStatus: 'valid',
      accessToken: page.access_token,
    }));

    return {
      success: true,
      data: {
        user: userProfile,
        pages: availablePages,
        totalPages: availablePages.length,
        hasPages: availablePages.length > 0,
        guidance:
          availablePages.length === 0
            ? 'No Facebook Pages found under your account. Ensure you have created a Facebook Page and have Admin access in Meta Business Suite.'
            : undefined,
      },
    };
  }

  async verifyFacebookToken(tenantId: string, accessToken: string, pageId?: string) {
    const token = accessToken?.trim();
    if (!token) {
      throw new BadRequestException('Facebook Access Token is required.');
    }

    try {
      // 1. Query Meta Graph API /me
      const meUrl = `https://graph.facebook.com/${this.metaApiVersion}/me?fields=id,name,category,picture{url},followers_count,fan_count&access_token=${token}`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json();

      if (meData?.error) {
        throw new BadRequestException(
          meData.error.message || 'Invalid or expired Meta Facebook access token.',
        );
      }

      // Check currently connected Page for this tenant
      const currentConfig = await this.prisma.channelConfig.findUnique({
        where: { tenantId_channel: { tenantId, channel: 'FACEBOOK' } },
      });
      const connectedPageId = currentConfig?.isConnected
        ? (currentConfig.config as any)?.pageId
        : null;

      // Case A: Token directly belongs to a Page (has category or matches requested pageId)
      if (meData.category || (pageId && pageId === meData.id)) {
        const page = {
          id: meData.id,
          name: meData.name,
          category: meData.category || 'Business Page',
          avatarUrl:
            meData.picture?.data?.url ||
            `https://graph.facebook.com/${this.metaApiVersion}/${meData.id}/picture?type=normal`,
          followerCount: meData.followers_count || meData.fan_count || 0,
          likesCount: meData.fan_count || 0,
          hasAdminPermission: true,
          isConnectedToCurrentWorkspace: Boolean(connectedPageId === meData.id),
          isConnectedToOtherWorkspace: false,
          accessTokenStatus: 'valid',
          accessToken: token,
        };

        return {
          success: true,
          type: 'PAGE',
          page,
          pages: [page],
        };
      }

      // Case B: Token belongs to a User, query /me/accounts
      const accountsUrl = `https://graph.facebook.com/${this.metaApiVersion}/me/accounts?fields=id,name,access_token,category,picture{url},fan_count,followers_count&access_token=${token}`;
      const accRes = await fetch(accountsUrl);
      const accData = await accRes.json();

      if (accRes.ok && Array.isArray(accData.data) && accData.data.length > 0) {
        const pages = accData.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'Business Page',
          avatarUrl:
            p.picture?.data?.url ||
            `https://graph.facebook.com/${this.metaApiVersion}/${p.id}/picture?type=normal`,
          followerCount: p.followers_count || p.fan_count || 0,
          likesCount: p.fan_count || 0,
          hasAdminPermission: true,
          isConnectedToCurrentWorkspace: Boolean(connectedPageId === p.id),
          isConnectedToOtherWorkspace: false,
          accessTokenStatus: 'valid',
          accessToken: p.access_token || token,
        }));

        return {
          success: true,
          type: 'USER_PAGES',
          pages,
        };
      }

      // Case C: If pageId was provided, query that page directly using the token
      if (pageId) {
        const directPageUrl = `https://graph.facebook.com/${this.metaApiVersion}/${pageId}?fields=id,name,category,picture{url},followers_count,fan_count&access_token=${token}`;
        const directRes = await fetch(directPageUrl);
        const directData = await directRes.json();

        if (directRes.ok && directData?.id) {
          const page = {
            id: directData.id,
            name: directData.name,
            category: directData.category || 'Business Page',
            avatarUrl:
              directData.picture?.data?.url ||
              `https://graph.facebook.com/${this.metaApiVersion}/${directData.id}/picture?type=normal`,
            followerCount: directData.followers_count || directData.fan_count || 0,
            likesCount: directData.fan_count || 0,
            hasAdminPermission: true,
            isConnectedToCurrentWorkspace: Boolean(connectedPageId === directData.id),
            isConnectedToOtherWorkspace: false,
            accessTokenStatus: 'valid',
            accessToken: token,
          };

          return {
            success: true,
            type: 'PAGE',
            page,
            pages: [page],
          };
        }
      }

      throw new BadRequestException(
        'The provided token is valid for a Facebook user, but no Facebook Pages were found. Please generate a Page Access Token with pages_show_list and pages_messaging permissions in Meta Graph API Explorer or Meta Business Suite.',
      );
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Error verifying Facebook token: ${err?.message || err}`);
      throw new BadRequestException(
        err?.message || 'Failed to verify Facebook access token with Meta Graph API.',
      );
    }
  }

  async connectFacebookPage(tenantId: string, dto: ConnectFacebookPageDto) {
    if (!dto.pageId || !dto.accessToken) {
      throw new BadRequestException('Page ID and Page Access Token are required.');
    }

    let pageName = dto.pageName?.trim();
    let category = dto.category;
    let avatarUrl = dto.avatarUrl;

    if (!pageName) {
      try {
        const pageRes = await fetch(
          `https://graph.facebook.com/${this.metaApiVersion}/${dto.pageId}?fields=id,name,category,picture{url}&access_token=${dto.accessToken}`,
        );
        const pageInfo = await pageRes.json();
        if (pageInfo?.name) {
          pageName = pageInfo.name;
          category = category || pageInfo.category;
          avatarUrl = avatarUrl || pageInfo.picture?.data?.url;
        }
      } catch (e) {
        // Fallback below
      }
    }
    pageName = pageName || `Facebook Page ${dto.pageId}`;

    this.logger.log(
      `Connecting Facebook Page ${pageName} (${dto.pageId}) for tenant ${tenantId}...`,
    );

    // Encrypt Page Access Token at rest using AES-256-GCM
    const encryptedToken = encryptPayload(dto.accessToken);

    // Auto-subscribe the Facebook Page to Webhooks via Meta Graph API
    let webhookSubscribed = false;
    try {
      const subscribeUrl = `https://graph.facebook.com/${this.metaApiVersion}/${dto.pageId}/subscribed_apps`;
      const subRes = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: [
            'messages',
            'messaging_postbacks',
            'message_deliveries',
            'message_reads',
          ],
          access_token: dto.accessToken,
        }),
      });
      const subData = await subRes.json();
      webhookSubscribed = Boolean(subData?.success);
      this.logger.log(
        `Meta Webhook auto-subscription for Facebook page ${dto.pageId}: ${JSON.stringify(
          subData,
        )}`,
      );
    } catch (subErr) {
      this.logger.warn(`Could not auto-subscribe page to webhooks: ${subErr}`);
    }

    const channelName = dto.channelName?.trim() || pageName;

    // Upsert into ChannelConfig table
    const config = await this.prisma.channelConfig.upsert({
      where: {
        tenantId_channel: { tenantId, channel: 'FACEBOOK' },
      },
      create: {
        tenantId,
        channel: 'FACEBOOK',
        isConnected: true,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        config: {
          id: `fb_${dto.pageId}`,
          pageId: dto.pageId,
          pageName: channelName,
          originalPageName: dto.pageName.trim(),
          category: dto.category || 'General & Business',
          avatarUrl: dto.avatarUrl || null,
          colorCode: dto.colorCode || '#4F46E5',
          botEnabled: dto.botEnabled ?? true,
          welcomeMessage: dto.welcomeMessage || '',
          accessToken: encryptedToken,
          webhookSubscribed,
          status: 'connected',
        },
      },
      update: {
        isConnected: true,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        config: {
          id: `fb_${dto.pageId}`,
          pageId: dto.pageId,
          pageName: channelName,
          originalPageName: dto.pageName.trim(),
          category: dto.category || 'General & Business',
          avatarUrl: dto.avatarUrl || null,
          colorCode: dto.colorCode || '#4F46E5',
          botEnabled: dto.botEnabled ?? true,
          welcomeMessage: dto.welcomeMessage || '',
          accessToken: encryptedToken,
          webhookSubscribed,
          status: 'connected',
        },
      },
    });

    // Log Activity
    await this.prisma.activityLog.create({
      data: {
        tenantId,
        action: `Connected Facebook Page: ${dto.pageName}`,
        module: 'Channels',
        status: 'Success',
      },
    });

    return {
      success: true,
      message: `Facebook Page ${dto.pageName} connected successfully`,
      data: {
        id: config.id,
        channel: 'FACEBOOK',
        isConnected: true,
        pageId: dto.pageId,
        pageName: channelName,
        category: dto.category || 'General & Business',
        botEnabled: dto.botEnabled ?? true,
        webhookSubscribed,
      },
    };
  }

  async getFacebookStatus(tenantId: string) {
    const config = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: { tenantId, channel: 'FACEBOOK' },
      },
    });

    if (!config || !config.isConnected) {
      return {
        success: true,
        data: {
          isConnected: false,
          channel: null,
        },
      };
    }

    const conf = (config.config as any) || {};

    return {
      success: true,
      data: {
        isConnected: true,
        id: config.id,
        pageId: conf.pageId || null,
        pageName: conf.pageName || 'Facebook Page',
        category: conf.category || null,
        avatarUrl: conf.avatarUrl || null,
        colorCode: conf.colorCode || '#4F46E5',
        botEnabled: conf.botEnabled ?? true,
        welcomeMessage: conf.welcomeMessage || '',
        webhookSubscribed: conf.webhookSubscribed ?? true,
        connectedAt: config.connectedAt,
        lastVerifiedAt: config.lastVerifiedAt,
      },
    };
  }

  async syncFacebookChannel(tenantId: string) {
    const config = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channel: { tenantId, channel: 'FACEBOOK' },
      },
    });

    if (!config || !config.isConnected) {
      throw new NotFoundException('No connected Facebook channel found for this tenant.');
    }

    const conf = (config.config as any) || {};
    if (!conf.accessToken || !conf.pageId) {
      throw new BadRequestException('Connected Facebook channel is missing Page ID or access token.');
    }

    let token: string;
    try {
      token = decryptPayload(conf.accessToken);
    } catch {
      throw new BadRequestException('Failed to decrypt Facebook access token.');
    }

    // Verify token & fetch fresh page details from Meta Graph API
    const pageUrl = `https://graph.facebook.com/${this.metaApiVersion}/${conf.pageId}?fields=id,name,category,picture{url},fan_count,followers_count&access_token=${token}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    if (!pageRes.ok || pageData.error) {
      const errMsg = pageData.error?.message || 'Meta token is invalid or expired';
      this.logger.warn(`Facebook sync error: ${errMsg}`);
      throw new BadRequestException(`Facebook sync failed: ${errMsg}`);
    }

    // Update lastVerifiedAt
    const updated = await this.prisma.channelConfig.update({
      where: { id: config.id },
      data: {
        lastVerifiedAt: new Date(),
        config: {
          ...conf,
          originalPageName: pageData.name || conf.originalPageName,
          category: pageData.category || conf.category,
          avatarUrl: pageData.picture?.data?.url || conf.avatarUrl,
        },
      },
    });

    return {
      success: true,
      message: 'Facebook Page status synced successfully with Meta Graph API',
      data: {
        isConnected: true,
        pageId: conf.pageId,
        pageName: conf.pageName,
        followerCount: pageData.followers_count || pageData.fan_count || 0,
        lastVerifiedAt: updated.lastVerifiedAt,
      },
    };
  }

  async getFacebookActivity(tenantId: string) {
    // Return real metrics from Conversation and Message tables
    const [totalConversations, totalMessages, recentConversations] = await Promise.all([
      this.prisma.conversation.count({
        where: { tenantId, channel: 'facebook' },
      }),
      this.prisma.message.count({
        where: { tenantId, conversation: { channel: 'facebook' } },
      }),
      this.prisma.conversation.findMany({
        where: { tenantId, channel: 'facebook' },
        orderBy: { lastMessageTime: 'desc' },
        take: 10,
        include: {
          contact: {
            select: { name: true, phone: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalConversations,
        totalMessages,
        recentConversations: recentConversations.map((c) => ({
          id: c.id,
          uid: c.uid,
          name: c.name,
          identifier: c.identifier,
          lastMessage: c.lastMessage,
          lastMessageSender: c.lastMessageSender,
          lastMessageTime: c.lastMessageTime,
          unreadCount: c.unreadCount,
          avatarUrl: c.avatarUrl || c.contact?.avatarUrl || null,
        })),
      },
    };
  }
}

