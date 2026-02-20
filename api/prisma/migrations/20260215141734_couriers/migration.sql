-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "courierFee" INTEGER,
ADD COLUMN     "courierId" TEXT,
ADD COLUMN     "courierRatingGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "pickedUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "CourierProfile" (
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "iin" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "lastAssignedAt" TIMESTAMP(3),
    "personalFeeOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CourierTariff" (
    "id" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierNote" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierProfile_isOnline_idx" ON "CourierProfile"("isOnline");

-- CreateIndex
CREATE INDEX "CourierProfile_iin_idx" ON "CourierProfile"("iin");

-- CreateIndex
CREATE INDEX "CourierTariff_isActive_startsAt_idx" ON "CourierTariff"("isActive", "startsAt");

-- CreateIndex
CREATE INDEX "CourierNote_courierUserId_createdAt_idx" ON "CourierNote"("courierUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CourierReview_courierUserId_createdAt_idx" ON "CourierReview"("courierUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CourierReview_orderId_idx" ON "CourierReview"("orderId");

-- CreateIndex
CREATE INDEX "CourierReview_userId_idx" ON "CourierReview"("userId");

-- CreateIndex
CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierProfile" ADD CONSTRAINT "CourierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierNote" ADD CONSTRAINT "CourierNote_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "CourierProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierNote" ADD CONSTRAINT "CourierNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierReview" ADD CONSTRAINT "CourierReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierReview" ADD CONSTRAINT "CourierReview_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "CourierProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierReview" ADD CONSTRAINT "CourierReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
