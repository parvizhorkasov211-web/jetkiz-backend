/*
  Warnings:

  - You are about to drop the column `isOnline` on the `CourierProfile` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeenAt` on the `CourierProfile` table. All the data in the column will be lost.
  - You are about to drop the column `personalFeeOverride` on the `CourierProfile` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `CourierTariff` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CourierTariff` table. All the data in the column will be lost.
  - You are about to drop the column `courierRatingGiven` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `CourierReview` will be added. If there are existing duplicate values, this will fail.
  - Made the column `courierFee` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CourierReview" DROP CONSTRAINT "CourierReview_orderId_fkey";

-- DropIndex
DROP INDEX "CourierNote_courierUserId_createdAt_idx";

-- DropIndex
DROP INDEX "CourierProfile_iin_idx";

-- DropIndex
DROP INDEX "CourierProfile_isOnline_idx";

-- DropIndex
DROP INDEX "CourierReview_courierUserId_createdAt_idx";

-- DropIndex
DROP INDEX "CourierReview_orderId_idx";

-- AlterTable
ALTER TABLE "CourierProfile" DROP COLUMN "isOnline",
DROP COLUMN "lastSeenAt",
DROP COLUMN "personalFeeOverride",
ADD COLUMN     "individualFee" INTEGER,
ADD COLUMN     "isOnLine" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CourierReview" ALTER COLUMN "orderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CourierTariff" DROP COLUMN "endsAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "startsAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "courierRatingGiven",
ALTER COLUMN "courierFee" SET NOT NULL,
ALTER COLUMN "courierFee" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "CourierNote_courierUserId_idx" ON "CourierNote"("courierUserId");

-- CreateIndex
CREATE INDEX "CourierNote_authorUserId_idx" ON "CourierNote"("authorUserId");

-- CreateIndex
CREATE INDEX "CourierNote_createdAt_idx" ON "CourierNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourierReview_orderId_key" ON "CourierReview"("orderId");

-- CreateIndex
CREATE INDEX "CourierReview_courierUserId_idx" ON "CourierReview"("courierUserId");

-- CreateIndex
CREATE INDEX "CourierReview_createdAt_idx" ON "CourierReview"("createdAt");

-- CreateIndex
CREATE INDEX "CourierTariff_createdAt_idx" ON "CourierTariff"("createdAt");

-- CreateIndex
CREATE INDEX "Order_assignedAt_idx" ON "Order"("assignedAt");

-- AddForeignKey
ALTER TABLE "CourierReview" ADD CONSTRAINT "CourierReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
