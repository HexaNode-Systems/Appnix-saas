-- Enable ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create TenantTier enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantTier') THEN
    CREATE TYPE "TenantTier" AS ENUM ('PLATFORM_ROOT', 'PRIMARY_RESELLER', 'SUB_RESELLER', 'END_CLIENT');
  END IF;
END $$;

-- Add RESELLER_ADMIN to Role enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'Role' AND e.enumlabel = 'RESELLER_ADMIN'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'RESELLER_ADMIN';
  END IF;
END $$;

-- Add hierarchy columns to tenants
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "tier" "TenantTier" NOT NULL DEFAULT 'END_CLIENT',
  ADD COLUMN IF NOT EXISTS "path" TEXT NOT NULL DEFAULT 'root',
  ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "parentId" TEXT,
  ADD COLUMN IF NOT EXISTS "customDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "maxSubResellers" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxEndClients" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 25;

-- Foreign key for hierarchy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_parentId_fkey'
  ) THEN
    ALTER TABLE "tenants" 
      ADD CONSTRAINT "tenants_parentId_fkey" 
      FOREIGN KEY ("parentId") REFERENCES "tenants"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes on tenants
CREATE INDEX IF NOT EXISTS "tenants_path_idx" ON "tenants"("path");
CREATE INDEX IF NOT EXISTS "tenants_parentId_idx" ON "tenants"("parentId");
CREATE INDEX IF NOT EXISTS "tenants_tier_status_idx" ON "tenants"("tier", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'tenants_customDomain_key'
  ) THEN
    CREATE UNIQUE INDEX "tenants_customDomain_key" ON "tenants"("customDomain") WHERE "customDomain" IS NOT NULL;
  END IF;
END $$;

-- GiST index on path::ltree
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_path_gist'
  ) THEN
    CREATE INDEX idx_tenants_path_gist ON "tenants" USING gist((path::ltree));
  END IF;
END $$;

-- Create domain_mappings table
CREATE TABLE IF NOT EXISTS "domain_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "domain" TEXT NOT NULL UNIQUE,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "sslProvisioned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "domain_mappings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "domain_mappings_tenantId_idx" ON "domain_mappings"("tenantId");
