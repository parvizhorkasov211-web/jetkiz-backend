/*
  Warnings:

  - A unique constraint covering the columns `[number]` on the table `CourierProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PricingSource" AS ENUM ('AUTO_DEFAULT', 'AUTO_WEATHER', 'MANUAL');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('ORDER_PAYOUT', 'BONUS', 'PENALTY', 'MANUAL_ADJUSTMENT', 'PAYOUT');

-- AlterTable
ALTER TABLE "CourierProfile" ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "payoutBonusAdd" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierBonusApplied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pricingSource" "PricingSource" NOT NULL DEFAULT 'AUTO_DEFAULT';

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "number" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "FinanceConfig" (
    "id" TEXT NOT NULL,
    "clientDeliveryFeeDefault" INTEGER NOT NULL DEFAULT 1200,
    "clientDeliveryFeeWeather" INTEGER NOT NULL DEFAULT 1500,
    "courierPayoutDefault" INTEGER NOT NULL DEFAULT 1100,
    "courierPayoutWeather" INTEGER NOT NULL DEFAULT 1500,
    "weatherEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierLedgerEntry" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierLedgerEntry_courierUserId_createdAt_idx" ON "CourierLedgerEntry"("courierUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CourierLedgerEntry_orderId_idx" ON "CourierLedgerEntry"("orderId");

-- CreateIndex
CREATE INDEX "CourierLedgerEntry_type_idx" ON "CourierLedgerEntry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CourierProfile_number_key" ON "CourierProfile"("number");

-- CreateIndex
CREATE INDEX "CourierProfile_number_idx" ON "CourierProfile"("number");

-- CreateIndex
CREATE INDEX "Order_pricingSource_idx" ON "Order"("pricingSource");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_number_key" ON "Restaurant"("number");

-- CreateIndex
CREATE INDEX "Restaurant_number_idx" ON "Restaurant"("number");

-- AddForeignKey
ALTER TABLE "CourierLedgerEntry" ADD CONSTRAINT "CourierLedgerEntry_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "CourierProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLedgerEntry" ADD CONSTRAINT "CourierLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
