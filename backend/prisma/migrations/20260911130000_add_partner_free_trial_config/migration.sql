-- Create wholesale_plans if not exists
CREATE TABLE IF NOT EXISTS "wholesale_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "perClientPrice" DECIMAL(10,2) NOT NULL,
    "clientLimit" INTEGER NOT NULL,
    "featureAccess" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_plans_pkey" PRIMARY KEY ("id")
);

-- Create partner_configs if not exists
CREATE TABLE IF NOT EXISTS "partner_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wholesalePlanId" TEXT,
    "setupFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "setupFeePaid" BOOLEAN NOT NULL DEFAULT true,
    "perClientRate" DECIMAL(10,2) NOT NULL DEFAULT 499,
    "clientLimit" INTEGER NOT NULL DEFAULT 20,
    "featureAccess" JSONB NOT NULL DEFAULT '[]',
    "customDomain" TEXT,
    "trialEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER NOT NULL DEFAULT 7,
    "trialMaxUsers" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_configs_pkey" PRIMARY KEY ("id")
);

-- Unique constraint and indices on partner_configs
CREATE UNIQUE INDEX IF NOT EXISTS "partner_configs_tenantId_key" ON "partner_configs"("tenantId");
CREATE INDEX IF NOT EXISTS "partner_configs_wholesalePlanId_idx" ON "partner_configs"("wholesalePlanId");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_configs_tenantId_fkey') THEN
    ALTER TABLE "partner_configs" ADD CONSTRAINT "partner_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_configs_wholesalePlanId_fkey') THEN
    ALTER TABLE "partner_configs" ADD CONSTRAINT "partner_configs_wholesalePlanId_fkey" FOREIGN KEY ("wholesalePlanId") REFERENCES "wholesale_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure trial columns on partner_configs in case table previously existed
ALTER TABLE "partner_configs"
  ADD COLUMN IF NOT EXISTS "trialEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trialDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS "trialMaxUsers" INTEGER NOT NULL DEFAULT 5;

-- Add isTrial to subscriptions
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- Add trialUsed to tenants
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "trialUsed" BOOLEAN NOT NULL DEFAULT false;
