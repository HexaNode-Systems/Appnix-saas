import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  ConnectInstagramAccountDto,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
} from './dto/instagram.dto';
import { encryptPayload, decryptPayload } from '../../common/utils/encryption.util';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

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

  private get defaultVerifyToken(): string {
    return (
      this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN') ||
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      'c90e38e2e8de0224bcfa6fd6aa7b6b123c96104a95bbec834b20b2b55f06a332'
    );
  }

  // -------------------------------------------------------------
  // 1. OAUTH URL & CODE EXCHANGE
  // -------------------------------------------------------------

  getOAuthUrl(tenantId: string, customRedirectUri?: string, configId?: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const redirectUri =
      customRedirectUri || `${frontendUrl}/channels/instagram/callback`;

    const statePayload = {
      tenantId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(12).toString('hex'),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
    ];

    const configParam = configId?.trim()
      ? `&config_id=${encodeURIComponent(configId.trim())}`
      : '';

    const oauthUrl = `https://www.facebook.com/${this.metaApiVersion}/dialog/oauth?client_id=${
      this.metaAppId
    }&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${scopes.join(',')}&response_type=code&state=${state}${configParam}`;

    return {
      success: true,
      data: {
        oauthUrl,
        state,
        appId: this.metaAppId,
        redirectUri,
      },
    };
  }

  async exchangeOAuthCode(
    tenantId: string,
    code: string,
    redirectUri: string,
  ) {
    this.logger.log(`Exchanging Meta OAuth code for tenant ${tenantId}...`);

    // Step 1: Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/${this.metaApiVersion}/oauth/access_token?client_id=${
      this.metaAppId
    }&client_secret=${this.metaAppSecret}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&code=${code}`;

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
    let userProfile: any = null;
    try {
      const meUrl = `https://graph.facebook.com/${this.metaApiVersion}/me?fields=id,name,email,picture{url}&access_token=${longLivedUserToken}`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json();
      if (meData && meData.id) {
        userProfile = {
          id: meData.id,
          name: meData.name,
          email: meData.email || `${meData.id}@facebook.com`,
          avatarUrl:
            meData.picture?.data?.url ||
            `https://graph.facebook.com/${this.metaApiVersion}/${meData.id}/picture?type=normal`,
          connectedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      this.logger.warn(`Could not fetch Meta user profile: ${e}`);
    }

    // Step 4: Fetch User's Pages and connected Instagram Business Accounts
    const pagesUrl = `https://graph.facebook.com/${this.metaApiVersion}/me/accounts?fields=id,name,access_token,category,picture{url},instagram_business_account{id,name,username,profile_picture_url,followers_count}&access_token=${longLivedUserToken}`;

    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok || pagesData.error) {
      const errMsg =
        pagesData.error?.message || 'Failed to fetch Facebook Pages from Meta API';
      this.logger.error(`Meta Pages query error: ${errMsg}`);
      throw new BadRequestException(errMsg);
    }

    const availableAccounts: Array<{
      instagramBusinessId: string;
      pageId: string;
      pageName: string;
      username: string;
      name: string;
      profilePictureUrl: string | null;
      followerCount: number;
      accessToken: string;
      isAlreadyConnected: boolean;
      isConnectedToCurrentWorkspace: boolean;
      isConnectedToOtherWorkspace: boolean;
    }> = [];

    const pages = pagesData.data || [];
    for (const page of pages) {
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        const existing = await this.prisma.instagramChannel.findUnique({
          where: { instagramBusinessId: ig.id },
        });

        const isConnectedHere = Boolean(
          existing && existing.status === 'ACTIVE' && existing.tenantId === tenantId,
        );
        const isConnectedOther = Boolean(
          existing && existing.status === 'ACTIVE' && existing.tenantId !== tenantId,
        );

        availableAccounts.push({
          instagramBusinessId: ig.id,
          pageId: page.id,
          pageName: page.name,
          username: ig.username || 'unknown',
          name: ig.name || page.name,
          profilePictureUrl: ig.profile_picture_url || null,
          followerCount: ig.followers_count || 0,
          accessToken: page.access_token, // Page access token derived from long-lived user token
          isAlreadyConnected: isConnectedHere,
          isConnectedToCurrentWorkspace: isConnectedHere,
          isConnectedToOtherWorkspace: isConnectedOther,
        });
      }
    }

    return {
      success: true,
      data: {
        user: userProfile,
        accounts: availableAccounts,
        totalAccounts: availableAccounts.length,
        totalPagesChecked: pages.length,
        hasEligibleAccounts: availableAccounts.length > 0,
        guidance:
          availableAccounts.length === 0
            ? 'No Instagram Professional accounts found linked to your Facebook Pages. Please ensure your Instagram is a Professional (Business or Creator) account and linked to a Facebook Page in Meta Business Suite.'
            : undefined,
      },
    };
  }

  // -------------------------------------------------------------
  // 2. DIRECT TOKEN VERIFICATION
  // -------------------------------------------------------------

  async verifyToken(
    tenantId: string,
    accessToken: string,
    instagramBusinessId?: string,
    pageId?: string,
  ) {
    const token = accessToken?.trim();
    if (!token) {
      throw new BadRequestException('Instagram/Facebook Access Token is required.');
    }

    try {
      // 1. Query Meta Graph API /me
      const meUrl = `https://graph.facebook.com/${this.metaApiVersion}/me?fields=id,name,email,category,picture{url}&access_token=${token}`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json();

      if (meData?.error) {
        throw new BadRequestException(
          meData.error.message || 'Invalid or expired Meta access token.',
        );
      }

      let userProfile: any = null;
      if (!meData.category) {
        userProfile = {
          id: meData.id,
          name: meData.name,
          email: meData.email || `${meData.id}@facebook.com`,
          avatarUrl:
            meData.picture?.data?.url ||
            `https://graph.facebook.com/${this.metaApiVersion}/${meData.id}/picture?type=normal`,
          connectedAt: new Date().toISOString(),
        };
      }

      const discoveredAccounts: Array<{
        instagramBusinessId: string;
        pageId: string;
        pageName: string;
        username: string;
        name: string;
        profilePictureUrl: string | null;
        followerCount: number;
        accessToken: string;
        isAlreadyConnected: boolean;
        isConnectedToCurrentWorkspace: boolean;
        isConnectedToOtherWorkspace: boolean;
      }> = [];

      // Case A: Token is a User token, query /me/accounts
      const accountsUrl = `https://graph.facebook.com/${this.metaApiVersion}/me/accounts?fields=id,name,access_token,category,picture{url},instagram_business_account{id,name,username,profile_picture_url,followers_count}&access_token=${token}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsData = await accountsRes.json();

      if (accountsRes.ok && Array.isArray(accountsData.data)) {
        for (const page of accountsData.data) {
          if (page.instagram_business_account) {
            const ig = page.instagram_business_account;
            const existing = await this.prisma.instagramChannel.findUnique({
              where: { instagramBusinessId: ig.id },
            });
            const isConnectedHere = Boolean(
              existing && existing.status === 'ACTIVE' && existing.tenantId === tenantId,
            );
            const isConnectedOther = Boolean(
              existing && existing.status === 'ACTIVE' && existing.tenantId !== tenantId,
            );

            discoveredAccounts.push({
              instagramBusinessId: ig.id,
              pageId: page.id,
              pageName: page.name,
              username: ig.username || 'unknown',
              name: ig.name || page.name,
              profilePictureUrl: ig.profile_picture_url || null,
              followerCount: ig.followers_count || 0,
              accessToken: page.access_token || token,
              isAlreadyConnected: isConnectedHere,
              isConnectedToCurrentWorkspace: isConnectedHere,
              isConnectedToOtherWorkspace: isConnectedOther,
            });
          }
        }
      }

      // Case B: Token is a Page Access Token (/me has instagram_business_account)
      if (discoveredAccounts.length === 0) {
        const pageQueryUrl = `https://graph.facebook.com/${this.metaApiVersion}/me?fields=id,name,category,instagram_business_account{id,name,username,profile_picture_url,followers_count}&access_token=${token}`;
        const pageRes = await fetch(pageQueryUrl);
        const pageData = await pageRes.json();

        if (pageRes.ok && pageData.instagram_business_account) {
          const ig = pageData.instagram_business_account;
          const existing = await this.prisma.instagramChannel.findUnique({
            where: { instagramBusinessId: ig.id },
          });
          const isConnectedHere = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId === tenantId,
          );
          const isConnectedOther = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId !== tenantId,
          );

          discoveredAccounts.push({
            instagramBusinessId: ig.id,
            pageId: pageData.id,
            pageName: pageData.name,
            username: ig.username || 'unknown',
            name: ig.name || pageData.name,
            profilePictureUrl: ig.profile_picture_url || null,
            followerCount: ig.followers_count || 0,
            accessToken: token,
            isAlreadyConnected: isConnectedHere,
            isConnectedToCurrentWorkspace: isConnectedHere,
            isConnectedToOtherWorkspace: isConnectedOther,
          });
        }
      }

      // Case C: Target specific pageId if provided
      if (discoveredAccounts.length === 0 && pageId) {
        const pageUrl = `https://graph.facebook.com/${this.metaApiVersion}/${pageId}?fields=id,name,category,instagram_business_account{id,name,username,profile_picture_url,followers_count}&access_token=${token}`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();

        if (pageRes.ok && pageData.instagram_business_account) {
          const ig = pageData.instagram_business_account;
          const existing = await this.prisma.instagramChannel.findUnique({
            where: { instagramBusinessId: ig.id },
          });
          const isConnectedHere = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId === tenantId,
          );
          const isConnectedOther = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId !== tenantId,
          );

          discoveredAccounts.push({
            instagramBusinessId: ig.id,
            pageId: pageData.id,
            pageName: pageData.name,
            username: ig.username || 'unknown',
            name: ig.name || pageData.name,
            profilePictureUrl: ig.profile_picture_url || null,
            followerCount: ig.followers_count || 0,
            accessToken: token,
            isAlreadyConnected: isConnectedHere,
            isConnectedToCurrentWorkspace: isConnectedHere,
            isConnectedToOtherWorkspace: isConnectedOther,
          });
        }
      }

      // Case D: Target specific instagramBusinessId if provided
      if (discoveredAccounts.length === 0 && instagramBusinessId) {
        const igUrl = `https://graph.facebook.com/${this.metaApiVersion}/${instagramBusinessId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${token}`;
        const igRes = await fetch(igUrl);
        const igData = await igRes.json();

        if (igRes.ok && igData.id) {
          const existing = await this.prisma.instagramChannel.findUnique({
            where: { instagramBusinessId: igData.id },
          });
          const isConnectedHere = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId === tenantId,
          );
          const isConnectedOther = Boolean(
            existing && existing.status === 'ACTIVE' && existing.tenantId !== tenantId,
          );

          discoveredAccounts.push({
            instagramBusinessId: igData.id,
            pageId: pageId || igData.id,
            pageName: igData.name || igData.username,
            username: igData.username || 'unknown',
            name: igData.name || igData.username,
            profilePictureUrl: igData.profile_picture_url || null,
            followerCount: igData.followers_count || 0,
            accessToken: token,
            isAlreadyConnected: isConnectedHere,
            isConnectedToCurrentWorkspace: isConnectedHere,
            isConnectedToOtherWorkspace: isConnectedOther,
          });
        }
      }

      if (discoveredAccounts.length === 0) {
        throw new BadRequestException(
          'The provided access token is valid, but no linked Instagram Professional account was found. Please ensure your Instagram is a Professional (Business or Creator) account and linked to a Facebook Page in Meta Business Suite.',
        );
      }

      return {
        success: true,
        data: {
          user: userProfile,
          accounts: discoveredAccounts,
          totalAccounts: discoveredAccounts.length,
        },
        user: userProfile,
        accounts: discoveredAccounts,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Error verifying Instagram token: ${err?.message || err}`);
      throw new BadRequestException(
        err?.message || 'Failed to verify Instagram access token with Meta Graph API.',
      );
    }
  }

  // -------------------------------------------------------------
  // 3. CONNECT INSTAGRAM ACCOUNT
  // -------------------------------------------------------------

  async connectAccount(tenantId: string, dto: ConnectInstagramAccountDto) {
    this.logger.log(
      `Connecting Instagram account @${dto.username} (${dto.instagramBusinessId}) for tenant ${tenantId}...`,
    );

    // Encrypt access token at rest
    const encryptedToken = encryptPayload(dto.accessToken);

    // Default 60-day token lifetime if not provided
    const tokenExpiresAt = dto.tokenExpiresAt
      ? new Date(dto.tokenExpiresAt)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const cleanUsername = dto.username.replace(/^@/, '').trim();
    const displayName = dto.channelName?.trim() || dto.name?.trim() || cleanUsername;

    // Upsert into InstagramChannel table
    const channel = await this.prisma.instagramChannel.upsert({
      where: { instagramBusinessId: dto.instagramBusinessId },
      create: {
        tenantId,
        instagramBusinessId: dto.instagramBusinessId,
        pageId: dto.pageId,
        username: cleanUsername,
        name: displayName,
        profilePictureUrl: dto.profilePictureUrl || null,
        accessToken: encryptedToken,
        tokenExpiresAt,
        status: 'ACTIVE',
      },
      update: {
        tenantId, // re-assign to active tenant
        pageId: dto.pageId,
        username: cleanUsername,
        name: displayName,
        profilePictureUrl: dto.profilePictureUrl || null,
        accessToken: encryptedToken,
        tokenExpiresAt,
        status: 'ACTIVE',
      },
    });

    // Auto-subscribe the Facebook Page to Instagram Webhooks via Meta Graph API
    let webhookSubscribed = false;
    try {
      const subscribeUrl = `https://graph.facebook.com/${this.metaApiVersion}/${dto.pageId}/subscribed_apps`;
      const subRes = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: ['messages', 'comments', 'mentions'],
          access_token: dto.accessToken,
        }),
      });
      const subData = await subRes.json();
      webhookSubscribed = Boolean(subData?.success || subRes.ok);
      this.logger.log(
        `Meta Webhook auto-subscription for page ${dto.pageId}: ${JSON.stringify(
          subData,
        )}`,
      );
    } catch (subErr) {
      this.logger.warn(`Could not auto-subscribe page to webhooks: ${subErr}`);
    }

    // Sync with general ChannelConfig so omnichannel tabs and stats register Instagram
    await this.prisma.channelConfig.upsert({
      where: { tenantId_channel: { tenantId, channel: 'INSTAGRAM' } },
      create: {
        tenantId,
        channel: 'INSTAGRAM',
        isConnected: true,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        config: {
          id: channel.id,
          instagramBusinessId: channel.instagramBusinessId,
          pageId: channel.pageId,
          accountHandle: `@${channel.username}`,
          accountName: displayName,
          profilePictureUrl: channel.profilePictureUrl,
          colorCode: dto.colorCode || '#E1306C',
          autoReplyEnabled: dto.autoReplyEnabled ?? true,
          welcomeMessage: dto.welcomeMessage || '',
          webhookSubscribed,
          status: 'connected',
        },
      },
      update: {
        isConnected: true,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        config: {
          id: channel.id,
          instagramBusinessId: channel.instagramBusinessId,
          pageId: channel.pageId,
          accountHandle: `@${channel.username}`,
          accountName: displayName,
          profilePictureUrl: channel.profilePictureUrl,
          colorCode: dto.colorCode || '#E1306C',
          autoReplyEnabled: dto.autoReplyEnabled ?? true,
          welcomeMessage: dto.welcomeMessage || '',
          webhookSubscribed,
          status: 'connected',
        },
      },
    });

    // Log Activity
    await this.prisma.activityLog.create({
      data: {
        tenantId,
        action: `Connected Instagram Account: @${channel.username}`,
        module: 'Channels',
        status: 'Success',
      },
    });

    return {
      success: true,
      message: `Instagram account @${channel.username} connected successfully!`,
      data: this.sanitizeChannel(channel),
    };
  }

  // -------------------------------------------------------------
  // 4. LIVE SYNC & RE-VERIFICATION
  // -------------------------------------------------------------

  async syncChannel(tenantId: string, channelId: string) {
    const channel = await this.prisma.instagramChannel.findFirst({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException(`Instagram channel ${channelId} not found`);
    }

    try {
      const rawToken = decryptPayload(channel.accessToken);
      const igUrl = `https://graph.facebook.com/${this.metaApiVersion}/${channel.instagramBusinessId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${rawToken}`;
      const igRes = await fetch(igUrl);
      const igData = await igRes.json();

      if (igData?.error) {
        if (igData.error.code === 190) {
          await this.prisma.instagramChannel.update({
            where: { id: channelId },
            data: { status: 'EXPIRED' },
          });
          return {
            success: false,
            message: 'Instagram access token has expired. Please reconnect your account.',
            data: { ...this.sanitizeChannel(channel), status: 'EXPIRED' },
          };
        }
        throw new BadRequestException(igData.error.message || 'Failed to sync with Meta');
      }

      const updated = await this.prisma.instagramChannel.update({
        where: { id: channelId },
        data: {
          username: igData.username || channel.username,
          name: igData.name || channel.name,
          profilePictureUrl: igData.profile_picture_url || channel.profilePictureUrl,
          status: 'ACTIVE',
        },
      });

      // Update ChannelConfig if needed
      await this.prisma.channelConfig.updateMany({
        where: { tenantId, channel: 'INSTAGRAM' },
        data: { lastVerifiedAt: new Date() },
      });

      return {
        success: true,
        message: `Account @${updated.username} synced successfully with Meta Graph API`,
        data: this.sanitizeChannel(updated),
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to sync Instagram channel ${channelId}: ${err?.message || err}`);
      throw new BadRequestException(err?.message || 'Failed to sync with Meta Graph API.');
    }
  }

  // -------------------------------------------------------------
  // 3. CHANNEL LISTING & MANAGEMENT
  // -------------------------------------------------------------

  async getChannels(tenantId: string) {
    const channels = await this.prisma.instagramChannel.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            rules: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: channels.map((ch) => this.sanitizeChannel(ch)),
    };
  }

  async getChannelById(tenantId: string, channelId: string) {
    const channel = await this.prisma.instagramChannel.findFirst({
      where: { id: channelId, tenantId },
      include: {
        rules: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Instagram channel ${channelId} not found`);
    }

    return {
      success: true,
      data: this.sanitizeChannel(channel),
    };
  }

  async disconnectChannel(tenantId: string, channelId: string) {
    const channel = await this.prisma.instagramChannel.findFirst({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException(`Instagram channel ${channelId} not found`);
    }

    await this.prisma.instagramChannel.update({
      where: { id: channelId },
      data: { status: 'DISCONNECTED' },
    });

    // Check if there are other active channels for this tenant
    const otherActive = await this.prisma.instagramChannel.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (otherActive === 0) {
      await this.prisma.channelConfig.updateMany({
        where: { tenantId, channel: 'INSTAGRAM' },
        data: { isConnected: false },
      });
    }

    return {
      success: true,
      message: `Instagram account @${channel.username} disconnected`,
    };
  }

  async deleteChannel(tenantId: string, channelId: string) {
    const channel = await this.prisma.instagramChannel.findFirst({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException(`Instagram channel ${channelId} not found`);
    }

    await this.prisma.instagramChannel.delete({
      where: { id: channelId },
    });

    const otherActive = await this.prisma.instagramChannel.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (otherActive === 0) {
      await this.prisma.channelConfig.updateMany({
        where: { tenantId, channel: 'INSTAGRAM' },
        data: { isConnected: false },
      });
    }

    return {
      success: true,
      message: `Instagram account @${channel.username} removed successfully`,
    };
  }

  // -------------------------------------------------------------
  // 4. AUTOMATION RULES CRUD
  // -------------------------------------------------------------

  async getRules(tenantId: string, channelId: string) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const rules = await this.prisma.instagramAutomationRule.findMany({
      where: { channelId, tenantId },
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: rules,
    };
  }

  async createRule(
    tenantId: string,
    channelId: string,
    dto: CreateAutomationRuleDto,
  ) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const cleanKeywords = dto.triggerKeywords
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (cleanKeywords.length === 0) {
      throw new BadRequestException('At least one trigger keyword is required');
    }

    const rule = await this.prisma.instagramAutomationRule.create({
      data: {
        tenantId,
        channelId,
        name: dto.name.trim(),
        postScope: dto.postScope || 'ALL_POSTS',
        specificMediaId:
          dto.postScope === 'SPECIFIC_POST'
            ? dto.specificMediaId?.trim() || null
            : null,
        triggerKeywords: cleanKeywords,
        publicReplyTemplate: dto.publicReplyTemplate?.trim() || null,
        privateDmTemplate: dto.privateDmTemplate.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      success: true,
      message: `Rule "${rule.name}" created successfully`,
      data: rule,
    };
  }

  async updateRule(
    tenantId: string,
    channelId: string,
    ruleId: string,
    dto: UpdateAutomationRuleDto,
  ) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const rule = await this.prisma.instagramAutomationRule.findFirst({
      where: { id: ruleId, channelId, tenantId },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.postScope !== undefined) {
      updateData.postScope = dto.postScope;
      updateData.specificMediaId =
        dto.postScope === 'SPECIFIC_POST'
          ? dto.specificMediaId?.trim() || null
          : null;
    }
    if (dto.triggerKeywords !== undefined) {
      updateData.triggerKeywords = dto.triggerKeywords
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    }
    if (dto.publicReplyTemplate !== undefined) {
      updateData.publicReplyTemplate = dto.publicReplyTemplate?.trim() || null;
    }
    if (dto.privateDmTemplate !== undefined) {
      updateData.privateDmTemplate = dto.privateDmTemplate.trim();
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.instagramAutomationRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return {
      success: true,
      message: `Rule updated successfully`,
      data: updated,
    };
  }

  async toggleRule(
    tenantId: string,
    channelId: string,
    ruleId: string,
    isActive: boolean,
  ) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const rule = await this.prisma.instagramAutomationRule.updateMany({
      where: { id: ruleId, channelId, tenantId },
      data: { isActive },
    });

    if (rule.count === 0) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    return {
      success: true,
      message: `Rule ${isActive ? 'enabled' : 'paused'}`,
      data: { id: ruleId, isActive },
    };
  }

  async deleteRule(tenantId: string, channelId: string, ruleId: string) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const deleted = await this.prisma.instagramAutomationRule.deleteMany({
      where: { id: ruleId, channelId, tenantId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    return {
      success: true,
      message: `Rule deleted successfully`,
    };
  }

  // -------------------------------------------------------------
  // 5. AUTOMATION LOGS & AUDITING
  // -------------------------------------------------------------

  async getLogs(
    tenantId: string,
    channelId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.ensureChannelOwnership(tenantId, channelId);

    const skip = (Math.max(1, page) - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.instagramAutomationLog.findMany({
        where: { channelId, tenantId },
        include: {
          rule: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.instagramAutomationLog.count({
        where: { channelId, tenantId },
      }),
    ]);

    return {
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  }

  async getAllTenantRules(tenantId: string) {
    const rules = await this.prisma.instagramAutomationRule.findMany({
      where: { tenantId },
      include: {
        channel: {
          select: { id: true, username: true, name: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: rules.map((r) => ({
        ...r,
        instagramChannelId: r.channelId,
        channelId: r.channelId,
        triggerCount: r._count?.logs || 0,
      })),
    };
  }

  async toggleRuleDirect(tenantId: string, ruleId: string, isActive: boolean) {
    const rule = await this.prisma.instagramAutomationRule.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    const updated = await this.prisma.instagramAutomationRule.update({
      where: { id: ruleId },
      data: { isActive },
    });

    return {
      success: true,
      message: `Rule "${updated.name}" ${isActive ? 'enabled' : 'paused'}`,
      data: { id: ruleId, isActive },
    };
  }

  async deleteRuleDirect(tenantId: string, ruleId: string) {
    const rule = await this.prisma.instagramAutomationRule.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule ${ruleId} not found`);
    }

    await this.prisma.instagramAutomationRule.delete({
      where: { id: ruleId },
    });

    return {
      success: true,
      message: `Rule deleted successfully`,
    };
  }

  async getAllTenantLogs(
    tenantId: string,
    channelId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (Math.max(1, page) - 1) * limit;
    const where: any = { tenantId };
    if (channelId && channelId !== 'ALL') {
      where.channelId = channelId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.instagramAutomationLog.findMany({
        where,
        include: {
          channel: {
            select: { id: true, username: true },
          },
          rule: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.instagramAutomationLog.count({ where }),
    ]);

    return {
      success: true,
      data: logs.map((log) => ({
        ...log,
        instagramChannelId: log.channelId,
        errorMessage: log.error,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async simulateRule(
    tenantId: string,
    dto: { ruleId?: string; commentText: string; username?: string; rule?: any },
  ) {
    let rule = dto.rule;
    if (dto.ruleId) {
      rule = await this.prisma.instagramAutomationRule.findFirst({
        where: { id: dto.ruleId, tenantId },
      });
    }

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    const comment = (dto.commentText || '').toLowerCase().trim();
    const keywords: string[] = rule.triggerKeywords || [];
    const matchedKeyword = keywords.find((kw: string) => comment.includes(kw.toLowerCase().trim()));

    const username = dto.username || 'demo_user';

    if (matchedKeyword) {
      const publicReply = rule.publicReplyTemplate
        ? rule.publicReplyTemplate.replace(/\{\{username\}\}/gi, `@${username}`)
        : null;
      const privateDm = (rule.privateDmTemplate || '').replace(/\{\{username\}\}/gi, username);

      return {
        success: true,
        data: {
          matched: true,
          keywordMatched: matchedKeyword,
          publicReply,
          privateDm,
        },
      };
    }

    return {
      success: true,
      data: {
        matched: false,
      },
    };
  }

  // -------------------------------------------------------------
  // 6. COMMENT-TO-DM AUTOMATION ENGINE (WEBHOOK WORKER)
  // -------------------------------------------------------------

  verifyWebhookSubscription(mode: string, token: string, challenge: string): string {
    if (mode === 'subscribe' && token === this.defaultVerifyToken) {
      this.logger.log('Meta Instagram Webhook subscription challenge verified');
      return challenge;
    }
    throw new UnauthorizedException('Meta webhook challenge verification failed');
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader?: string,
  ): boolean {
    if (!this.metaAppSecret) return true;
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    const expectedSignature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', this.metaAppSecret);
    const digest = hmac.update(rawBody).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(digest, 'hex'),
    );
  }

  /**
   * Process webhook asynchronously to guarantee immediate < 3 sec response to Meta.
   */
  async processWebhookAsync(payload: any) {
    if (!payload?.entry || !Array.isArray(payload.entry)) return;

    for (const entry of payload.entry) {
      const entryId = entry.id; // Instagram Business Account ID or Page ID
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field === 'comments') {
          await this.handleIncomingComment(change.value, entryId);
        }
      }
    }
  }

  private async handleIncomingComment(commentValue: any, entryId: string) {
    if (!commentValue || !commentValue.id) return;

    const commentId = commentValue.id;
    const commentText = (commentValue.text || '').trim();
    const mediaId = commentValue.media?.id || null;
    const fromUser = commentValue.from || {};
    const senderInstagramId = fromUser.id || '';
    const senderUsername = fromUser.username || '';

    this.logger.log(
      `[Instagram Comment Ingestion] Comment ID: ${commentId} by @${senderUsername}: "${commentText}" on entry ${entryId}`,
    );

    // Find the connected Instagram channel corresponding to entryId
    const channel = await this.prisma.instagramChannel.findFirst({
      where: {
        OR: [
          { instagramBusinessId: entryId },
          { pageId: entryId },
        ],
        status: 'ACTIVE',
      },
    });

    if (!channel) {
      this.logger.warn(
        `No active Instagram channel found matching Meta entryId ${entryId}. Skipping automation.`,
      );
      return;
    }

    // Filter out comments made by the page/account itself to prevent infinite reply loops!
    if (
      senderInstagramId === channel.instagramBusinessId ||
      (senderUsername &&
        senderUsername.toLowerCase() === channel.username.toLowerCase())
    ) {
      this.logger.debug(
        `Ignored self-comment from @${senderUsername} on channel @${channel.username}`,
      );
      return;
    }

    // Fetch active automation rules for this channel
    const rules = await this.prisma.instagramAutomationRule.findMany({
      where: {
        channelId: channel.id,
        isActive: true,
      },
    });

    if (rules.length === 0) {
      this.logger.debug(`No active automation rules for channel @${channel.username}`);
      return;
    }

    // Decrypt long-lived Access Token
    let accessToken = '';
    try {
      accessToken = decryptPayload(channel.accessToken);
    } catch (decErr) {
      this.logger.error(`Failed to decrypt channel access token: ${decErr}`);
      return;
    }

    const lowerComment = commentText.toLowerCase();

    // Evaluate rules against comment
    for (const rule of rules) {
      // 1. Post Scope Check
      if (rule.postScope === 'SPECIFIC_POST' && rule.specificMediaId) {
        if (rule.specificMediaId !== mediaId) {
          continue;
        }
      }

      // 2. Keyword Trigger Check (case-insensitive)
      const matched = rule.triggerKeywords.some((keyword) => {
        const cleanKw = keyword.trim().toLowerCase();
        if (!cleanKw) return false;
        // Regex word-boundary or substring match
        return lowerComment.includes(cleanKw);
      });

      if (!matched) continue;

      this.logger.log(
        `[Rule Matched] Rule "${rule.name}" triggered by comment "${commentText}"`,
      );

      // Execute Automation Action
      await this.executeCommentToDmAction(
        channel,
        rule,
        commentId,
        commentText,
        mediaId,
        senderInstagramId,
        senderUsername,
        accessToken,
      );

      // Only execute the first matching rule per comment to avoid spam
      break;
    }
  }

  private async executeCommentToDmAction(
    channel: any,
    rule: any,
    commentId: string,
    commentText: string,
    mediaId: string | null,
    senderInstagramId: string,
    senderUsername: string,
    accessToken: string,
  ) {
    let publicReplySent = false;
    let privateDmSent = false;
    let errorMessage: string | null = null;

    const templateVariables: Record<string, string> = {
      username: senderUsername || 'there',
      name: senderUsername || 'there',
      channel_name: channel.name || channel.username,
    };

    const renderText = (tmpl: string) => {
      let res = tmpl;
      for (const [k, v] of Object.entries(templateVariables)) {
        res = res.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v);
      }
      return res;
    };

    // Step A: Public Comment Reply (if configured)
    if (rule.publicReplyTemplate && rule.publicReplyTemplate.trim()) {
      const publicReplyBody = renderText(rule.publicReplyTemplate.trim());
      try {
        const replyUrl = `https://graph.facebook.com/${this.metaApiVersion}/${commentId}/replies`;
        const replyRes = await fetch(replyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message: publicReplyBody }),
        });

        const replyData = await replyRes.json();
        if (replyRes.ok && replyData.id) {
          publicReplySent = true;
          this.logger.log(
            `Public reply sent to comment ${commentId}: "${publicReplyBody}"`,
          );
        } else {
          this.handleMetaApiError(channel.id, replyData);
          errorMessage = `Public Reply Error: ${
            replyData.error?.message || 'Meta API rejected reply'
          }`;
          this.logger.warn(errorMessage);
        }
      } catch (err: any) {
        errorMessage = `Public Reply Network Exception: ${err.message}`;
        this.logger.error(errorMessage);
      }
    }

    // Step B: Private Direct Message (DM)
    if (rule.privateDmTemplate && rule.privateDmTemplate.trim()) {
      const privateDmBody = renderText(rule.privateDmTemplate.trim());
      try {
        const messageUrl = `https://graph.facebook.com/${this.metaApiVersion}/${channel.instagramBusinessId}/messages`;

        // Official Meta Instagram Messaging Private Reply format: recipient with comment_id
        const payloadWithCommentId = {
          recipient: {
            comment_id: commentId,
          },
          message: {
            text: privateDmBody,
          },
        };

        let msgRes = await fetch(messageUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payloadWithCommentId),
        });

        let msgData = await msgRes.json();

        // Fallback to user-scoped ID if comment_id recipient was rejected
        if (!msgRes.ok && senderInstagramId) {
          this.logger.debug(
            `comment_id recipient failed, falling back to id recipient: ${senderInstagramId}`,
          );
          const payloadWithUserId = {
            recipient: {
              id: senderInstagramId,
            },
            message: {
              text: privateDmBody,
            },
          };

          msgRes = await fetch(messageUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payloadWithUserId),
          });

          msgData = await msgRes.json();
        }

        if (msgRes.ok && msgData.message_id) {
          privateDmSent = true;
          this.logger.log(
            `Private DM sent successfully to @${senderUsername}: "${privateDmBody}"`,
          );
        } else {
          this.handleMetaApiError(channel.id, msgData);
          const dmErr = `Private DM Error: ${
            msgData.error?.message || 'Meta API rejected message'
          }`;
          errorMessage = errorMessage ? `${errorMessage}; ${dmErr}` : dmErr;
          this.logger.warn(dmErr);
        }
      } catch (err: any) {
        const netErr = `Private DM Network Exception: ${err.message}`;
        errorMessage = errorMessage ? `${errorMessage}; ${netErr}` : netErr;
        this.logger.error(netErr);
      }
    }

    // Step C: Log Execution
    try {
      await this.prisma.instagramAutomationLog.create({
        data: {
          tenantId: channel.tenantId,
          channelId: channel.id,
          ruleId: rule.id,
          commentId,
          commentText,
          mediaId,
          senderInstagramId,
          senderUsername,
          publicReplySent,
          privateDmSent,
          status: privateDmSent || publicReplySent ? 'SUCCESS' : 'FAILED',
          error: errorMessage,
        },
      });
    } catch (logErr) {
      this.logger.error(`Failed to create InstagramAutomationLog: ${logErr}`);
    }
  }

  /**
   * Handle token expiration (Error 190) and rate limits (Error 429)
   */
  private async handleMetaApiError(channelId: string, metaResponse: any) {
    const code = metaResponse?.error?.code;
    const subcode = metaResponse?.error?.error_subcode;

    // Error 190: Access token has expired or revoked
    if (code === 190) {
      this.logger.error(
        `Access token expired or revoked for Instagram channel ${channelId} (Code 190, Subcode ${subcode}). Marking channel as EXPIRED.`,
      );
      await this.prisma.instagramChannel.update({
        where: { id: channelId },
        data: { status: 'EXPIRED' },
      });
    }

    // Error 4 or 429: Application/User rate limit reached
    if (code === 4 || code === 429 || metaResponse?.error?.type === 'OAuthRateLimitException') {
      this.logger.warn(
        `Meta Graph API Rate limit exceeded for channel ${channelId}. Backing off.`,
      );
    }
  }

  private async ensureChannelOwnership(tenantId: string, channelId: string) {
    const exists = await this.prisma.instagramChannel.findFirst({
      where: { id: channelId, tenantId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Instagram channel ${channelId} not found`);
    }
  }

  private sanitizeChannel(channel: any) {
    const { accessToken, ...rest } = channel;
    return {
      ...rest,
      instagramId: channel.instagramBusinessId,
      instagramBusinessId: channel.instagramBusinessId,
      facebookPageId: channel.pageId,
      pageId: channel.pageId,
      status: channel.status === 'ACTIVE' ? 'CONNECTED' : channel.status,
      hasToken: Boolean(accessToken),
    };
  }
}
