ALTER TABLE "FinanceConfig"
ADD COLUMN IF NOT EXISTS "courierCommissionPctDefault" integer NOT NULL DEFAULT 15;