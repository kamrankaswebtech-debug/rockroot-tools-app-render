-- CreateTable
CREATE TABLE "EstimatorProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "density" REAL NOT NULL DEFAULT 1.0,
    "unit" TEXT NOT NULL DEFAULT 'tonnes',
    "category" TEXT NOT NULL DEFAULT 'other',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimatorProduct_shop_shopifyProductId_key" ON "EstimatorProduct"("shop", "shopifyProductId");
