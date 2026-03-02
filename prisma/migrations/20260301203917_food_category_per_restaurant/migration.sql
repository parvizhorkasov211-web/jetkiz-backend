/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,code]` on the table `FoodCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `restaurantId` to the `FoodCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FoodCategory_code_key";

-- DropIndex
DROP INDEX "FoodCategory_sortOrder_idx";

-- AlterTable
ALTER TABLE "FoodCategory" ADD COLUMN     "restaurantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FoodCategory_restaurantId_sortOrder_idx" ON "FoodCategory"("restaurantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FoodCategory_restaurantId_code_key" ON "FoodCategory"("restaurantId", "code");

-- AddForeignKey
ALTER TABLE "FoodCategory" ADD CONSTRAINT "FoodCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
