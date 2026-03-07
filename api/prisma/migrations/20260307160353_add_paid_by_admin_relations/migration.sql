-- AlterTable
ALTER TABLE "CourierPayout" ADD COLUMN     "paidByAdminId" TEXT,
ADD COLUMN     "paymentComment" TEXT,
ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "RestaurantPayout" ADD COLUMN     "paidByAdminId" TEXT,
ADD COLUMN     "paymentComment" TEXT,
ADD COLUMN     "paymentReference" TEXT;

-- CreateIndex
CREATE INDEX "CourierPayout_paidByAdminId_idx" ON "CourierPayout"("paidByAdminId");

-- CreateIndex
CREATE INDEX "RestaurantPayout_paidByAdminId_idx" ON "RestaurantPayout"("paidByAdminId");

-- AddForeignKey
ALTER TABLE "RestaurantPayout" ADD CONSTRAINT "RestaurantPayout_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierPayout" ADD CONSTRAINT "CourierPayout_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
