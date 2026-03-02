-- AlterTable
ALTER TABLE "FinanceConfig" ADD COLUMN     "restaurantCommissionPctDefault" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "restaurantCommissionPctOverride" INTEGER;

-- CreateIndex
CREATE INDEX "Restaurant_restaurantCommissionPctOverride_idx" ON "Restaurant"("restaurantCommissionPctOverride");
