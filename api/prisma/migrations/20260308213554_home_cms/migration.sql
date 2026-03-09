-- CreateTable
CREATE TABLE "HomeCmsConfig" (
    "id" TEXT NOT NULL,
    "promoTitleRu" TEXT,
    "promoTitleKk" TEXT,
    "promoImageUrl" TEXT,
    "promoIsActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeCmsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeCmsCategory" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleKk" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeCmsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeCmsCategory_configId_sortOrder_idx" ON "HomeCmsCategory"("configId", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeCmsCategory_isActive_idx" ON "HomeCmsCategory"("isActive");

-- AddForeignKey
ALTER TABLE "HomeCmsCategory" ADD CONSTRAINT "HomeCmsCategory_configId_fkey" FOREIGN KEY ("configId") REFERENCES "HomeCmsConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
