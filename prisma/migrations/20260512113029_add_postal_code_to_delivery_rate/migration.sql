-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL DEFAULT '',
    "weekday" REAL NOT NULL,
    "saturday" REAL NOT NULL,
    "sunday" REAL NOT NULL
);
INSERT INTO "new_DeliveryRate" ("id", "saturday", "shop", "suburb", "sunday", "weekday") SELECT "id", "saturday", "shop", "suburb", "sunday", "weekday" FROM "DeliveryRate";
DROP TABLE "DeliveryRate";
ALTER TABLE "new_DeliveryRate" RENAME TO "DeliveryRate";
CREATE UNIQUE INDEX "DeliveryRate_shop_suburb_key" ON "DeliveryRate"("shop", "suburb");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
