-- CreateEnum
CREATE TYPE "RestaurantPayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "restaurantCommissionAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "restaurantCommissionPctApplied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "restaurantPayoutAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "restaurantPayoutId" TEXT;

-- CreateTable
CREATE TABLE "RestaurantPayout" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "grossSubtotal" INTEGER NOT NULL DEFAULT 0,
    "commissionAmount" INTEGER NOT NULL DEFAULT 0,
    "payoutAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "RestaurantPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantPayout_restaurantId_idx" ON "RestaurantPayout"("restaurantId");

-- CreateIndex
CREATE INDEX "RestaurantPayout_status_idx" ON "RestaurantPayout"("status");

-- CreateIndex
CREATE INDEX "RestaurantPayout_paidAt_idx" ON "RestaurantPayout"("paidAt");

-- CreateIndex
CREATE INDEX "RestaurantPayout_periodFrom_periodTo_idx" ON "RestaurantPayout"("periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "Order_restaurantPayoutId_idx" ON "Order"("restaurantPayoutId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantPayoutId_fkey" FOREIGN KEY ("restaurantPayoutId") REFERENCES "RestaurantPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPayout" ADD CONSTRAINT "RestaurantPayout_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
