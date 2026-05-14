-- CreateTable
CREATE TABLE "DeliveryRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "weekday" REAL NOT NULL,
    "saturday" REAL NOT NULL,
    "sunday" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRate_shop_suburb_key" ON "DeliveryRate"("shop", "suburb");
