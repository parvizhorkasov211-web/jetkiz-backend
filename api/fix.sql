ALTER TABLE "CourierOnlineEvent"
ADD COLUMN IF NOT EXISTS "source" TEXT;

UPDATE "CourierOnlineEvent"
SET "source" = 'system'
WHERE "source" IS NULL;

ALTER TABLE "CourierOnlineEvent"
ALTER COLUMN "source" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "CourierOnlineEvent_source_idx"
ON "CourierOnlineEvent" ("source");