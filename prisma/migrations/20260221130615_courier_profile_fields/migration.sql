/*
  Warnings:

  - You are about to drop the column `createdAt` on the `CourierOnlineEvent` table. All the data in the column will be lost.
  - Made the column `updatedAt` on table `CourierTariff` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CourierOnlineEvent" DROP CONSTRAINT "CourierOnlineEvent_courierUserId_fkey";

-- DropIndex
DROP INDEX "CourierOnlineEvent_courierUserId_idx";

-- DropIndex
DROP INDEX "CourierOnlineEvent_createdAt_idx";

-- AlterTable
ALTER TABLE "CourierOnlineEvent" DROP COLUMN "createdAt",
ADD COLUMN     "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CourierProfile" ADD COLUMN     "addressText" TEXT,
ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "comment" TEXT;

-- AlterTable
ALTER TABLE "CourierTariff" ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CourierOnlineEvent_courierUserId_at_idx" ON "CourierOnlineEvent"("courierUserId", "at");

-- CreateIndex
CREATE INDEX "CourierOnlineEvent_at_idx" ON "CourierOnlineEvent"("at");

-- CreateIndex
CREATE INDEX "CourierProfile_iin_idx" ON "CourierProfile"("iin");

-- AddForeignKey
ALTER TABLE "CourierOnlineEvent" ADD CONSTRAINT "CourierOnlineEvent_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "CourierProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
