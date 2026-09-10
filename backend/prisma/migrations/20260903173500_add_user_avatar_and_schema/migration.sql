-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('API_KEY', 'BEARER_TOKEN', 'OAUTH2', 'BASIC_AUTH');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('INBOUND_MESSAGE', 'WEBHOOK_EVENT', 'SCHEDULED_CRON', 'FORM_SUBMISSION');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY_FOR_TEST', 'TEST_SENT', 'SCHEDULED', 'LAUNCHING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LaunchMode" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'RCS', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "AudienceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'india',
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "secondaryEmail" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zipCode" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "maxBots" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxMessages" INTEGER NOT NULL DEFAULT 25000,
ADD COLUMN     "maxTeamSeats" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "planName" TEXT NOT NULL DEFAULT 'Professional Tier',
ADD COLUMN     "price" TEXT NOT NULL DEFAULT '₹2,999/mo',
ADD COLUMN     "remainingDays" INTEGER NOT NULL DEFAULT 77,
ADD COLUMN     "totalDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "usedBots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usedMessages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usedTeamSeats" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "planId" SET DEFAULT 'pro',
ALTER COLUMN "currentPeriodEnd" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "crm_contacts" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "department" TEXT DEFAULT 'sales',
ADD COLUMN     "superFieldValues" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" TEXT NOT NULL DEFAULT 'Professional Tier (Monthly)',
    "amount" TEXT NOT NULL DEFAULT '₹2,999.00',
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "autoRechargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRechargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
    "defaultPaymentMethod" TEXT NOT NULL DEFAULT 'UPI / NetBanking',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'Payment Gateway',
    "amount" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "campaignName" TEXT,
    "templateName" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "type" TEXT NOT NULL DEFAULT 'DEBIT',
    "unitCount" INTEGER NOT NULL DEFAULT 1,
    "unitRate" DOUBLE PRECISION NOT NULL DEFAULT 0.78,
    "baseRate" DOUBLE PRECISION DEFAULT 0.72,
    "platformFee" DOUBLE PRECISION DEFAULT 0.04,
    "taxAmount" DOUBLE PRECISION DEFAULT 0.02,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.78,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'DELIVERED',
    "isAutoRefunded" BOOLEAN NOT NULL DEFAULT false,
    "refundTxnId" TEXT,
    "failedReason" TEXT,
    "metaBillingId" TEXT,
    "wabaId" TEXT,
    "messagePayloadSnippet" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_fields" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "options" JSONB DEFAULT '[]',
    "defaultValue" JSONB,
    "helperText" TEXT,
    "placeholder" TEXT,
    "currencySymbol" TEXT DEFAULT '₹',
    "validation" JSONB NOT NULL DEFAULT '{"isRequired":false}',
    "placement" JSONB NOT NULL DEFAULT '{"contactProfile":true,"chatInboxLabel":true,"chatInboxSidebar":true}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "icon" TEXT NOT NULL DEFAULT 'star',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "department" TEXT NOT NULL DEFAULT 'sales',
    "assignedAgentId" TEXT,
    "assignedAgentName" TEXT,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessage" TEXT NOT NULL DEFAULT '',
    "lastMessageTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageSender" TEXT NOT NULL DEFAULT 'customer',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "session" JSONB DEFAULT '{"isActive":true,"remainingHours":24}',
    "isBotActive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "superFields" JSONB DEFAULT '{}',
    "internalNotes" JSONB DEFAULT '[]',
    "remarks" JSONB DEFAULT '{"sentiment":"neutral","leadStage":"Discovery","notes":""}',
    "scheduledMessages" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'customer',
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateName" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "providerMessageId" TEXT,
    "carrierAudit" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audienceId" TEXT,
    "audienceName" TEXT,
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "audienceSnapshot" JSONB,
    "channel" "ChannelType" NOT NULL,
    "metaTemplateId" TEXT,
    "metaTemplateName" TEXT,
    "metaTemplateLanguage" TEXT,
    "templateVariables" JSONB,
    "variableMappings" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "launchMode" "LaunchMode" NOT NULL DEFAULT 'IMMEDIATE',
    "scheduledAt" TIMESTAMP(3),
    "testSentAt" TIMESTAMP(3),
    "testRecipient" TEXT,
    "testStatus" "TestStatus",
    "testMessageId" TEXT,
    "launchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_audiences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contactIds" TEXT[],
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AudienceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "connectedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metaTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "language" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL,
    "components" JSONB NOT NULL,
    "preview" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rcs_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelId" TEXT,
    "agentId" TEXT NOT NULL DEFAULT 'agent_appnix_rcs',
    "agentName" TEXT NOT NULL DEFAULT 'Appnix RCS Verified',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'PROMOTIONAL',
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "textBody" TEXT,
    "standaloneActions" JSONB DEFAULT '[]',
    "card" JSONB,
    "cards" JSONB DEFAULT '[]',
    "variables" JSONB DEFAULT '[]',
    "variableMappings" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rcsTemplateId" TEXT,
    "carrierApprovals" JSONB DEFAULT '[]',
    "rejectionReason" TEXT,
    "rejectionDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "rcs_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "folderId" TEXT,
    "triggerType" "TriggerType" NOT NULL DEFAULT 'INBOUND_MESSAGE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_licenses" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "workflowId" TEXT,
    "workflowTitle" TEXT,
    "redeemedBy" TEXT,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_stores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "keyType" TEXT NOT NULL DEFAULT 'STRING',
    "ttlSeconds" INTEGER,
    "recordLimit" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_store_records" (
    "id" TEXT NOT NULL,
    "dataStoreId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_store_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channels" TEXT[],
    "apps" TEXT[],
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "authType" "AuthType" NOT NULL,
    "credentials" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "linkedWorkflowsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" JSONB NOT NULL DEFAULT '{"label":"Active","tone":"green"}',
    "tag" JSONB NOT NULL DEFAULT '{"label":"General","tone":"green"}',
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'Building2',
    "avatars" JSONB DEFAULT '[]',
    "extraCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "badgeTone" TEXT NOT NULL DEFAULT 'blue',
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Technical Support',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "description" TEXT NOT NULL,
    "assignedAgent" JSONB,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replies" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "user" TEXT NOT NULL DEFAULT 'System',
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '127.0.0.1',
    "status" TEXT NOT NULL DEFAULT 'Success',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'INBOUND_MESSAGE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "interactionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "objectKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'CLOUDFLARE_R2',
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_tenantId_key" ON "wallets"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_transactionId_key" ON "wallet_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "wallet_transactions_tenantId_idx" ON "wallet_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "channel_transactions_tenantId_idx" ON "channel_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "super_fields_tenantId_idx" ON "super_fields"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "super_fields_tenantId_key_key" ON "super_fields"("tenantId", "key");

-- CreateIndex
CREATE INDEX "contact_tags_tenantId_idx" ON "contact_tags"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_tags_tenantId_slug_key" ON "contact_tags"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "conversations_tenantId_idx" ON "conversations"("tenantId");

-- CreateIndex
CREATE INDEX "conversations_contactId_idx" ON "conversations"("contactId");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_tenantId_idx" ON "messages"("tenantId");

-- CreateIndex
CREATE INDEX "messages_providerMessageId_idx" ON "messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_audiences_tenantId_idx" ON "campaign_audiences"("tenantId");

-- CreateIndex
CREATE INDEX "channel_configs_tenantId_idx" ON "channel_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_configs_tenantId_channel_key" ON "channel_configs"("tenantId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "meta_templates_metaTemplateId_key" ON "meta_templates"("metaTemplateId");

-- CreateIndex
CREATE INDEX "meta_templates_tenantId_idx" ON "meta_templates"("tenantId");

-- CreateIndex
CREATE INDEX "rcs_templates_tenantId_idx" ON "rcs_templates"("tenantId");

-- CreateIndex
CREATE INDEX "folders_tenantId_idx" ON "folders"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "folders_tenantId_name_key" ON "folders"("tenantId", "name");

-- CreateIndex
CREATE INDEX "workflows_tenantId_idx" ON "workflows"("tenantId");

-- CreateIndex
CREATE INDEX "workflows_folderId_idx" ON "workflows"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_licenses_key_key" ON "workflow_licenses"("key");

-- CreateIndex
CREATE INDEX "data_stores_tenantId_idx" ON "data_stores"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "data_stores_tenantId_slug_key" ON "data_stores"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "data_store_records_dataStoreId_key_idx" ON "data_store_records"("dataStoreId", "key");

-- CreateIndex
CREATE INDEX "data_store_records_expiresAt_idx" ON "data_store_records"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "data_store_records_dataStoreId_key_key" ON "data_store_records"("dataStoreId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_slug_key" ON "workflow_templates"("slug");

-- CreateIndex
CREATE INDEX "app_credentials_tenantId_idx" ON "app_credentials"("tenantId");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_idx" ON "role_permissions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenantId_roleId_key" ON "role_permissions"("tenantId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_tenantId_idx" ON "support_tickets"("tenantId");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_idx" ON "activity_logs"("tenantId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "bots_tenantId_idx" ON "bots"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_eventId_key" ON "webhook_events"("eventId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_eventId_idx" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "webhook_events_tenantId_idx" ON "webhook_events"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "media_objectKey_key" ON "media"("objectKey");

-- CreateIndex
CREATE INDEX "media_tenantId_idx" ON "media"("tenantId");

-- CreateIndex
CREATE INDEX "media_category_idx" ON "media"("category");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_apiKey_key" ON "tenants"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_transactions" ADD CONSTRAINT "channel_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "super_fields" ADD CONSTRAINT "super_fields_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_configs" ADD CONSTRAINT "channel_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_templates" ADD CONSTRAINT "meta_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcs_templates" ADD CONSTRAINT "rcs_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_stores" ADD CONSTRAINT "data_stores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_store_records" ADD CONSTRAINT "data_store_records_dataStoreId_fkey" FOREIGN KEY ("dataStoreId") REFERENCES "data_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_credentials" ADD CONSTRAINT "app_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

