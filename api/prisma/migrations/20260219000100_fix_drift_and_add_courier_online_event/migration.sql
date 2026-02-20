BEGIN;

-- ===============================
-- COURIER PROFILE FIX (drift safe)
-- ===============================

-- 1) вернуть/создать новые колонки (если их нет)
ALTER TABLE "CourierProfile"
  ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "personalFeeOverride" INTEGER;

-- 2) удалить старые кривые колонки (если вдруг остались)
ALTER TABLE "CourierProfile"
  DROP COLUMN IF EXISTS "isOnLine",
  DROP COLUMN IF EXISTS "individualFee";

-- 3) индекс
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CourierProfile_isOnline_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "CourierProfile_isOnline_idx" ON "CourierProfile"("isOnline")';
  END IF;
END$$;

-- ===============================
-- COURIER TARIFF FIX (drift safe)
-- ===============================

ALTER TABLE "CourierTariff"
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- заполнить updatedAt если null (чтобы не было мусора)
UPDATE "CourierTariff"
SET "updatedAt" = COALESCE("updatedAt", "createdAt");

ALTER TABLE "CourierTariff"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CourierTariff_endsAt_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "CourierTariff_endsAt_idx" ON "CourierTariff"("endsAt")';
  END IF;
END$$;

-- ===============================
-- COURIER ONLINE EVENTS TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS "CourierOnlineEvent" (
  "id" TEXT PRIMARY KEY,
  "courierUserId" TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK (без дублей)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourierOnlineEvent_courierUserId_fkey'
  ) THEN
    ALTER TABLE "CourierOnlineEvent"
      ADD CONSTRAINT "CourierOnlineEvent_courierUserId_fkey"
      FOREIGN KEY ("courierUserId")
      REFERENCES "CourierProfile"("userId")
      ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "CourierOnlineEvent_courierUserId_idx"
  ON "CourierOnlineEvent"("courierUserId");

CREATE INDEX IF NOT EXISTS "CourierOnlineEvent_createdAt_idx"
  ON "CourierOnlineEvent"("createdAt");

COMMIT;
