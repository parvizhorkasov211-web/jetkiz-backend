-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "promisedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "workingHours" TEXT;

-- CreateIndex
CREATE INDEX "Order_promisedAt_idx" ON "Order"("promisedAt");
