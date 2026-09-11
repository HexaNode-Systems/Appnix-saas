-- Add trial configuration to partner_configs
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
