-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "composition" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isDrink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight" TEXT;
