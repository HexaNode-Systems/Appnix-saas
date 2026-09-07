-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InstagramChannelStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISCONNECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InstagramPostScope" AS ENUM ('ALL_POSTS', 'SPECIFIC_POST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InstagramAutomationStatus" AS ENUM ('SUCCESS', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "instagram_channels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "instagramBusinessId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "profilePictureUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "InstagramChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "instagram_automation_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postScope" "InstagramPostScope" NOT NULL DEFAULT 'ALL_POSTS',
    "specificMediaId" TEXT,
    "triggerKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicReplyTemplate" TEXT,
    "privateDmTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "instagram_automation_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ruleId" TEXT,
    "commentId" TEXT NOT NULL,
    "commentText" TEXT,
    "mediaId" TEXT,
    "senderInstagramId" TEXT NOT NULL,
    "senderUsername" TEXT,
    "publicReplySent" BOOLEAN NOT NULL DEFAULT false,
    "privateDmSent" BOOLEAN NOT NULL DEFAULT false,
    "status" "InstagramAutomationStatus" NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "instagram_channels_instagramBusinessId_key" ON "instagram_channels"("instagramBusinessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_channels_tenantId_idx" ON "instagram_channels"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_channels_instagramBusinessId_idx" ON "instagram_channels"("instagramBusinessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_automation_rules_channelId_idx" ON "instagram_automation_rules"("channelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_automation_rules_tenantId_idx" ON "instagram_automation_rules"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_automation_logs_channelId_idx" ON "instagram_automation_logs"("channelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_automation_logs_ruleId_idx" ON "instagram_automation_logs"("ruleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instagram_automation_logs_tenantId_idx" ON "instagram_automation_logs"("tenantId");

-- AddForeignKey
ALTER TABLE "instagram_channels" DROP CONSTRAINT IF EXISTS "instagram_channels_tenantId_fkey";
ALTER TABLE "instagram_channels" ADD CONSTRAINT "instagram_channels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automation_rules" DROP CONSTRAINT IF EXISTS "instagram_automation_rules_tenantId_fkey";
ALTER TABLE "instagram_automation_rules" ADD CONSTRAINT "instagram_automation_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automation_rules" DROP CONSTRAINT IF EXISTS "instagram_automation_rules_channelId_fkey";
ALTER TABLE "instagram_automation_rules" ADD CONSTRAINT "instagram_automation_rules_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "instagram_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automation_logs" DROP CONSTRAINT IF EXISTS "instagram_automation_logs_tenantId_fkey";
ALTER TABLE "instagram_automation_logs" ADD CONSTRAINT "instagram_automation_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automation_logs" DROP CONSTRAINT IF EXISTS "instagram_automation_logs_channelId_fkey";
ALTER TABLE "instagram_automation_logs" ADD CONSTRAINT "instagram_automation_logs_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "instagram_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_automation_logs" DROP CONSTRAINT IF EXISTS "instagram_automation_logs_ruleId_fkey";
ALTER TABLE "instagram_automation_logs" ADD CONSTRAINT "instagram_automation_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "instagram_automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
