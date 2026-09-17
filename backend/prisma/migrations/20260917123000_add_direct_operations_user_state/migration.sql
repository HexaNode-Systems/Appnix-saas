-- Operational fields used by the isolated Direct Operations staff API.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "department" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_role_isActive_idx" ON "users"("role", "isActive");
