-- CreateEnum
CREATE TYPE "CourierPayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierPayoutId" TEXT;

-- CreateTable
CREATE TABLE "CourierPayout" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" INTEGER NOT NULL DEFAULT 0,
    "commissionAmount" INTEGER NOT NULL DEFAULT 0,
    "payoutAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "CourierPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierPayout_courierUserId_idx" ON "CourierPayout"("courierUserId");

-- CreateIndex
CREATE INDEX "CourierPayout_status_idx" ON "CourierPayout"("status");

-- CreateIndex
CREATE INDEX "CourierPayout_paidAt_idx" ON "CourierPayout"("paidAt");

-- CreateIndex
CREATE INDEX "CourierPayout_periodFrom_periodTo_idx" ON "CourierPayout"("periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");

-- CreateIndex
CREATE INDEX "Order_courierPayoutId_idx" ON "Order"("courierPayoutId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierPayoutId_fkey" FOREIGN KEY ("courierPayoutId") REFERENCES "CourierPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierPayout" ADD CONSTRAINT "CourierPayout_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "CourierProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
