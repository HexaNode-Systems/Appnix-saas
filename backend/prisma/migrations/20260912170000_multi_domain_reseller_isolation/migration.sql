-- Create Role enum additions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'Role' AND e.enumlabel = 'APP_ADMIN'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'APP_ADMIN';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'Role' AND e.enumlabel = 'CLIENT_USER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'CLIENT_USER';
  END IF;
END $$;

-- Create SslStatus enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SslStatus') THEN
    CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
  END IF;
END $$;

-- Create DomainVerificationStatus enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DomainVerificationStatus') THEN
    CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
  END IF;
END $$;

-- Extend domain_mappings table
ALTER TABLE "domain_mappings"
  ADD COLUMN IF NOT EXISTS "status" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "expectedDnsTarget" TEXT NOT NULL DEFAULT 'cname.appnix.co.in',
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "dnsRecordType" TEXT DEFAULT 'CNAME',
  ADD COLUMN IF NOT EXISTS "dnsExpectedValue" TEXT DEFAULT 'cname.appnix.co.in',
  ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sslProvisioned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);

-- Convert sslStatus column to SslStatus enum safely
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_mappings' AND column_name = 'sslStatus' AND data_type = 'text'
  ) THEN
    ALTER TABLE "domain_mappings" ALTER COLUMN "sslStatus" DROP DEFAULT;
    ALTER TABLE "domain_mappings" 
      ALTER COLUMN "sslStatus" TYPE "SslStatus" 
      USING (
        CASE 
          WHEN "sslStatus" = 'ACTIVE' THEN 'ACTIVE'::"SslStatus"
          WHEN "sslStatus" = 'FAILED' THEN 'FAILED'::"SslStatus"
          ELSE 'PENDING'::"SslStatus"
        END
      );
    ALTER TABLE "domain_mappings" ALTER COLUMN "sslStatus" SET DEFAULT 'PENDING';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_mappings' AND column_name = 'sslStatus'
  ) THEN
    ALTER TABLE "domain_mappings" ADD COLUMN "sslStatus" "SslStatus" NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "domain_mappings_domain_idx" ON "domain_mappings"("domain");
CREATE INDEX IF NOT EXISTS "domain_mappings_tenantId_idx" ON "domain_mappings"("tenantId");
