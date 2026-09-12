import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { decryptPayload } from '../../common/utils/encryption.util';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly metaApiVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

  constructor(private readonly prisma: PrismaService) {}

  // ----------------- META (WHATSAPP / INSTAGRAM / FACEBOOK) -----------------

  verifyMetaSubscription(mode: string, token: string, challenge: string): string {
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'appnix_meta_verify_secret_2026';
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Meta Webhook subscription challenge verified');
      return challenge;
    }
    throw new UnauthorizedException('Meta webhook challenge verification failed: Token mismatch');
  }

  verifyMetaSignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      // If no META_APP_SECRET is set in dev/local, allow with warning
      this.logger.warn('META_APP_SECRET not configured; skipping HMAC verification in non-production');
      return true;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', appSecret);
    const digest = hmac.update(rawBody).digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const digestBuf = Buffer.from(digest, 'hex');

    if (expectedBuf.length !== digestBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, digestBuf);
  }

  async handleMetaWebhook(payload: any, rawBody?: string | Buffer, signatureHeader?: string) {
    if (rawBody && signatureHeader && !this.verifyMetaSignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid Meta Webhook HMAC-SHA256 signature');
    }

    // Iterate through entry and changes
    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return { success: true, message: 'No entries in webhook' };
    }

    for (const entry of payload.entry) {
      const entryId = entry.id; // WABA ID or Page ID

      // 1. Messenger Messaging Events (Facebook Page)
      const messagingEvents = entry.messaging || entry.standby;
      if (Array.isArray(messagingEvents)) {
        for (const event of messagingEvents) {
          await this.processIncomingFacebookMessengerEvent(event, entryId);
        }
      }

      // 2. WhatsApp / Changes Events
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // Process Messages (WhatsApp)
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            await this.processIncomingMetaMessage(value, msg, entryId);
          }
        }

        // Process Status Updates (WhatsApp)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            await this.processMetaStatusUpdate(statusObj);
          }
        }
      }
    }

    return { success: true, processed: true };
  }

  private async processIncomingMetaMessage(value: any, msg: any, wabaId: string) {
    const messageId = msg.id; // e.g. wamid.HBg...
    if (!messageId) return;

    // Idempotency Check
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: `meta_msg_${messageId}` },
    });
    if (existingEvent) {
      this.logger.log(`Duplicate webhook event skipped: ${messageId}`);
      return;
    }

    // Determine Tenant from WABA / ChannelConfig or default tenant
    let tenantId = 'tenant_default';
    const channelConfig = await this.prisma.channelConfig.findFirst({
      where: {
        channel: 'WHATSAPP',
        isConnected: true,
      },
    });
    if (channelConfig) {
      tenantId = channelConfig.tenantId;
    } else {
      const firstTenant = await this.prisma.tenant.findFirst();
      if (firstTenant) tenantId = firstTenant.id;
    }

    const contactPhone = `+${msg.from}`;
    const contactName = value.contacts?.[0]?.profile?.name || contactPhone;

    // Extract text from text or interactive button replies
    let textContent = '';
    if (msg.type === 'text') {
      textContent = msg.text?.body || '';
    } else if (msg.type === 'interactive') {
      textContent =
        msg.interactive?.button_reply?.title ||
        msg.interactive?.list_reply?.title ||
        'Interactive Response';
    } else if (msg.type === 'button') {
      textContent = msg.button?.text || '';
    } else {
      textContent = `[Media: ${msg.type}]`;
    }

    // Record Webhook Event for Deduplication
    await this.prisma.webhookEvent.create({
      data: {
        tenantId,
        provider: 'META',
        eventId: `meta_msg_${messageId}`,
        eventType: `messages.${msg.type}`,
        payload: msg,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Find or Create CRM Contact
    let contact = await this.prisma.crmContact.findFirst({
      where: { tenantId, phone: contactPhone },
    });
    if (!contact) {
      contact = await this.prisma.crmContact.create({
        data: {
          tenantId,
          name: contactName,
          phone: contactPhone,
          tags: ['Inbound Lead'],
        },
      });
    }

    // Find or Create Conversation
    let conv = await this.prisma.conversation.findFirst({
      where: { tenantId, identifier: contactPhone },
    });

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          tenantId,
          uid: `CHT-${Math.floor(100000 + Math.random() * 900000)}`,
          name: contactName,
          identifier: contactPhone,
          contactId: contact.id,
          channel: 'whatsapp',
          department: 'sales',
          unreadCount: 1,
          lastMessage: textContent,
          lastMessageSender: 'customer',
          lastMessageTime: new Date(),
          session: {
            isActive: true,
            lastCustomerMessageAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            remainingHours: 24,
            formattedRemaining: '24h remaining',
          },
        },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: {
          lastMessage: textContent,
          lastMessageTime: new Date(),
          lastMessageSender: 'customer',
          unreadCount: { increment: 1 },
          session: {
            isActive: true,
            lastCustomerMessageAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            remainingHours: 24,
            formattedRemaining: '24h remaining',
          },
        },
      });
    }

    // Persist Incoming Message
    await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        tenantId,
        sender: 'customer',
        senderName: contactName,
        text: textContent,
        providerMessageId: messageId,
        status: 'delivered',
        timestamp: new Date(parseInt(msg.timestamp, 10) * 1000 || Date.now()),
      },
    });

    this.logger.log(`Persisted inbound WhatsApp message ${messageId} from ${contactPhone}`);
  }

  private async processMetaStatusUpdate(statusObj: any) {
    const messageId = statusObj.id; // wamid
    const status = statusObj.status; // sent, delivered, read, failed

    if (!messageId || !status) return;

    // Record Event
    const eventId = `meta_status_${messageId}_${status}`;
    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existing) return;

    await this.prisma.webhookEvent.create({
      data: {
        provider: 'META',
        eventId,
        eventType: `message.status.${status}`,
        payload: statusObj,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Update Message status in DB
    const message = await this.prisma.message.findFirst({
      where: { providerMessageId: messageId },
    });

    if (message) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status },
      });
    }
  }

  private async processIncomingFacebookMessengerEvent(event: any, entryPageId: string) {
    const pageId = entryPageId || event.recipient?.id;
    const senderId = event.sender?.id; // PSID (Page-scoped User ID)

    if (!senderId || !pageId) return;

    // Ignore echoes sent by the Page itself
    if (event.message?.is_echo) {
      this.logger.log(`Ignoring echo message from Page ${pageId}`);
      return;
    }

    // Determine tenant from Facebook ChannelConfig
    let tenantId = 'tenant_default';
    let pageConfig: any = null;
    const allFbConfigs = await this.prisma.channelConfig.findMany({
      where: { channel: 'FACEBOOK', isConnected: true },
    });

    for (const fc of allFbConfigs) {
      const c = fc.config as any;
      if (c?.pageId === pageId) {
        tenantId = fc.tenantId;
        pageConfig = c;
        break;
      }
    }

    if (!pageConfig && allFbConfigs.length > 0) {
      tenantId = allFbConfigs[0].tenantId;
      pageConfig = allFbConfigs[0].config as any;
    } else if (!pageConfig) {
      const firstTenant = await this.prisma.tenant.findFirst();
      if (firstTenant) tenantId = firstTenant.id;
    }

    // 1. Delivery Receipts
    if (event.delivery && Array.isArray(event.delivery.mids)) {
      for (const mid of event.delivery.mids) {
        await this.prisma.message.updateMany({
          where: { providerMessageId: mid, tenantId },
          data: { status: 'delivered' },
        });
      }
      return;
    }

    // 2. Read Receipts
    if (event.read) {
      const conv = await this.prisma.conversation.findFirst({
        where: { tenantId, identifier: senderId, channel: 'facebook' },
      });
      if (conv) {
        await this.prisma.message.updateMany({
          where: { conversationId: conv.id, sender: { in: ['agent', 'bot'] } },
          data: { status: 'read' },
        });
      }
      return;
    }

    // 3. Inbound Message or Postback
    const messageObj = event.message;
    const postbackObj = event.postback;

    if (!messageObj && !postbackObj) return;

    const messageId = messageObj?.mid || `fb_pb_${event.timestamp || Date.now()}_${senderId}`;

    // Deduplication check
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: `meta_fb_${messageId}` },
    });
    if (existingEvent) {
      this.logger.log(`Duplicate Facebook Messenger event skipped: ${messageId}`);
      return;
    }

    // Extract message content
    let textContent = '';
    if (messageObj?.text) {
      textContent = messageObj.text;
    } else if (
      messageObj?.attachments &&
      Array.isArray(messageObj.attachments) &&
      messageObj.attachments.length > 0
    ) {
      const firstAtt = messageObj.attachments[0];
      textContent = `[Attachment: ${firstAtt.type || 'media'}]`;
    } else if (postbackObj?.title || postbackObj?.payload) {
      textContent = postbackObj.title || postbackObj.payload;
    } else {
      textContent = '[Facebook Message]';
    }

    // Record Webhook Event for Deduplication
    await this.prisma.webhookEvent.create({
      data: {
        tenantId,
        provider: 'META',
        eventId: `meta_fb_${messageId}`,
        eventType: 'messaging.facebook',
        payload: event,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Resolve Contact Name & Avatar
    let contactName = `Facebook User (${senderId.slice(-4)})`;
    let contactAvatar: string | null = null;

    if (pageConfig?.accessToken) {
      try {
        const decryptedToken = decryptPayload(pageConfig.accessToken);
        const userRes = await fetch(
          `https://graph.facebook.com/${this.metaApiVersion}/${senderId}?fields=first_name,last_name,profile_pic&access_token=${decryptedToken}`,
        );
        const userData = await userRes.json();
        if (userData?.first_name) {
          contactName = `${userData.first_name} ${userData.last_name || ''}`.trim();
        }
        if (userData?.profile_pic) {
          contactAvatar = userData.profile_pic;
        }
      } catch (profileErr) {
        this.logger.warn(`Could not fetch PSID profile from Meta: ${profileErr}`);
      }
    }

    // Find or Create CRM Contact
    let contact = await this.prisma.crmContact.findFirst({
      where: { tenantId, phone: `fb:${senderId}` },
    });

    if (!contact) {
      contact = await this.prisma.crmContact.create({
        data: {
          tenantId,
          name: contactName,
          phone: `fb:${senderId}`,
          avatarUrl: contactAvatar,
          tags: ['Facebook Messenger', 'Inbound Lead'],
        },
      });
    } else if (contactAvatar && !contact.avatarUrl) {
      await this.prisma.crmContact.update({
        where: { id: contact.id },
        data: { avatarUrl: contactAvatar },
      });
    }

    // Find or Create Conversation
    let conv = await this.prisma.conversation.findFirst({
      where: { tenantId, identifier: senderId, channel: 'facebook' },
    });

    const isNewConversation = !conv;

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          tenantId,
          uid: `CHT-${Math.floor(100000 + Math.random() * 900000)}`,
          name: contactName,
          identifier: senderId,
          contactId: contact.id,
          channel: 'facebook',
          department: 'sales',
          unreadCount: 1,
          lastMessage: textContent,
          lastMessageSender: 'customer',
          lastMessageTime: new Date(),
          avatarUrl: contactAvatar,
          session: {
            isActive: true,
            lastCustomerMessageAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            remainingHours: 24,
            formattedRemaining: '24h remaining',
          },
        },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: {
          lastMessage: textContent,
          lastMessageTime: new Date(),
          lastMessageSender: 'customer',
          unreadCount: { increment: 1 },
          session: {
            isActive: true,
            lastCustomerMessageAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            remainingHours: 24,
            formattedRemaining: '24h remaining',
          },
        },
      });
    }

    // Persist Incoming Message
    await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        tenantId,
        sender: 'customer',
        senderName: contactName,
        senderAvatar: contactAvatar,
        text: textContent,
        providerMessageId: messageId,
        status: 'delivered',
        timestamp: new Date(event.timestamp || Date.now()),
      },
    });

    this.logger.log(`Persisted inbound Facebook Messenger message ${messageId} from ${senderId}`);

    // Optional Automated Greeting Bot on first inbound message
    if (
      isNewConversation &&
      pageConfig?.botEnabled &&
      pageConfig?.welcomeMessage &&
      pageConfig?.accessToken
    ) {
      try {
        const decryptedToken = decryptPayload(pageConfig.accessToken);
        const replyRes = await fetch(
          `https://graph.facebook.com/${this.metaApiVersion}/me/messages?access_token=${decryptedToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: pageConfig.welcomeMessage },
            }),
          },
        );
        const replyData = await replyRes.json();
        if (replyData?.message_id) {
          await this.prisma.message.create({
            data: {
              conversationId: conv.id,
              tenantId,
              sender: 'bot',
              senderName: `${pageConfig.pageName || 'Facebook'} Bot`,
              text: pageConfig.welcomeMessage,
              providerMessageId: replyData.message_id,
              status: 'delivered',
              timestamp: new Date(),
            },
          });
          await this.prisma.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessage: pageConfig.welcomeMessage,
              lastMessageSender: 'bot',
              lastMessageTime: new Date(),
            },
          });
        }
      } catch (botErr) {
        this.logger.warn(`Could not dispatch automated Facebook greeting: ${botErr}`);
      }
    }
  }

  // ----------------- META LOGIN FOR BUSINESS / COMPLIANCE CALLBACKS -----------------

  parseMetaSignedRequest(signedRequest?: string): any {
    if (!signedRequest || typeof signedRequest !== 'string') {
      throw new BadRequestException('signed_request parameter is missing or invalid');
    }

    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid signed_request format');
    }

    const [encodedSig, encodedPayload] = parts;
    const appSecret = process.env.META_APP_SECRET;

    if (appSecret) {
      const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(encodedPayload)
        .digest();
      const actualSig = Buffer.from(encodedSig, 'base64url');

      if (
        actualSig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(actualSig, expectedSig)
      ) {
        throw new UnauthorizedException('Invalid signed_request HMAC-SHA256 signature');
      }
    } else {
      this.logger.warn('META_APP_SECRET not configured; skipping signed_request verification in non-production');
    }

    try {
      const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      return JSON.parse(payloadJson);
    } catch {
      throw new BadRequestException('Failed to decode signed_request JSON payload');
    }
  }

  async handleMetaDeauthorize(signedRequest?: string, rawPayload?: any) {
    let payload = rawPayload;
    if (signedRequest) {
      try {
        payload = this.parseMetaSignedRequest(signedRequest);
      } catch (err: any) {
        this.logger.error(`Meta deauthorize verification failed: ${err.message}`);
        throw err;
      }
    }

    const userId = payload?.user_id || 'unknown_user';
    this.logger.log(`Received Meta deauthorization event for User ID: ${userId}`);

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        tenantId: 'tenant_default',
        action: `Meta user revoked Appnix permissions (Deauthorized) - Meta User ID: ${userId}`,
        module: 'Channels > Meta',
        status: 'Warning',
      },
    }).catch((err) => {
      this.logger.warn(`Could not persist deauthorization activity log: ${err.message}`);
    });

    // Record webhook event for idempotency and audit
    await this.prisma.webhookEvent.create({
      data: {
        provider: 'META',
        eventId: `meta_deauth_${userId}_${Date.now()}`,
        eventType: 'user.deauthorized',
        payload: payload || {},
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    }).catch(() => null);

    return { success: true, message: 'Meta deauthorization processed successfully' };
  }

  async handleMetaDataDeletion(signedRequest?: string, rawPayload?: any) {
    let payload = rawPayload;
    if (signedRequest) {
      try {
        payload = this.parseMetaSignedRequest(signedRequest);
      } catch (err: any) {
        this.logger.error(`Meta data deletion verification failed: ${err.message}`);
        throw err;
      }
    }

    const userId = payload?.user_id || 'unknown_user';
    const confirmationCode = `del_${crypto.randomBytes(8).toString('hex')}`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.appnix.co.in';

    this.logger.log(`Received Meta Data Deletion request for User ID: ${userId}, Confirmation Code: ${confirmationCode}`);

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        tenantId: 'tenant_default',
        action: `Meta user submitted Data Deletion request - Meta User ID: ${userId}, Code: ${confirmationCode}`,
        module: 'Compliance > Data Deletion',
        status: 'Warning',
      },
    }).catch((err) => {
      this.logger.warn(`Could not persist data deletion activity log: ${err.message}`);
    });

    // Record webhook event
    await this.prisma.webhookEvent.create({
      data: {
        provider: 'META',
        eventId: `meta_datadel_${userId}_${Date.now()}`,
        eventType: 'user.data_deletion_requested',
        payload: { ...(payload || {}), confirmationCode },
        status: 'PENDING_DELETION',
        processedAt: new Date(),
      },
    }).catch(() => null);

    // Meta strictly requires this response JSON structure: { url, confirmation_code }
    return {
      url: `${frontendUrl}/data-deletion?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }
}
