-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "isInApp" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Restaurant_isInApp_idx" ON "Restaurant"("isInApp");
