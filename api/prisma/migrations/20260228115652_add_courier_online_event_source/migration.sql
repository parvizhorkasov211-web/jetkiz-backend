/*
  Warnings:

  - You are about to drop the column `descriptionKk` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionRu` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `Promo` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Promo` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Promo` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Promo` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `Promo` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Review` table. All the data in the column will be lost.
  - Added the required column `source` to the `CourierOnlineEvent` table without a default value. This is not possible if the table is not empty.
  - Made the column `titleRu` on table `Promo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `titleKk` on table `Promo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `restaurantId` on table `Promo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE 'SERVICE_COMMISSION';

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Promo" DROP CONSTRAINT "Promo_productId_fkey";

-- DropForeignKey
ALTER TABLE "Promo" DROP CONSTRAINT "Promo_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropIndex
DROP INDEX "Promo_isActive_sortOrder_idx";

-- DropIndex
DROP INDEX "Promo_productId_idx";

-- DropIndex
DROP INDEX "Promo_targetType_idx";

-- DropIndex
DROP INDEX "Review_orderId_idx";

-- DropIndex
DROP INDEX "Review_orderId_key";

-- DropIndex
DROP INDEX "Review_productId_idx";

-- AlterTable
ALTER TABLE "CourierOnlineEvent" ADD COLUMN     "source" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CourierProfile" ADD COLUMN     "courierCommissionPctOverride" INTEGER;

-- AlterTable
ALTER TABLE "FinanceConfig" ADD COLUMN     "courierCommissionPctDefault" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierCommissionAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "courierCommissionPctApplied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "courierFeeGross" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "descriptionKk",
DROP COLUMN "descriptionRu";

-- AlterTable
ALTER TABLE "Promo" DROP COLUMN "endsAt",
DROP COLUMN "productId",
DROP COLUMN "sortOrder",
DROP COLUMN "startsAt",
DROP COLUMN "targetType",
ADD COLUMN     "textKk" TEXT,
ADD COLUMN     "textRu" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL,
ALTER COLUMN "titleRu" SET NOT NULL,
ALTER COLUMN "titleKk" SET NOT NULL,
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "orderId",
DROP COLUMN "productId";

-- DropEnum
DROP TYPE "PromoTargetType";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "floor" TEXT,
    "door" TEXT,
    "comment" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "CourierOnlineEvent_source_idx" ON "CourierOnlineEvent"("source");

-- CreateIndex
CREATE INDEX "CourierProfile_lastSeenAt_idx" ON "CourierProfile"("lastSeenAt");

-- CreateIndex
CREATE INDEX "CourierProfile_lastActiveAt_idx" ON "CourierProfile"("lastActiveAt");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- CreateIndex
CREATE INDEX "Promo_isActive_idx" ON "Promo"("isActive");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promo" ADD CONSTRAINT "Promo_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
