-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "densitySoil" REAL NOT NULL DEFAULT 1.4,
    "densitySand" REAL NOT NULL DEFAULT 1.5,
    "densityGravel" REAL NOT NULL DEFAULT 1.5,
    "densityScoria" REAL NOT NULL DEFAULT 0.85,
    "densityRoadbase" REAL NOT NULL DEFAULT 1.8,
    "densityRecycled" REAL NOT NULL DEFAULT 1.25,
    "densityBluemetal" REAL NOT NULL DEFAULT 1.5,
    "concreteSandMetal" REAL NOT NULL DEFAULT 0.7,
    "concreteCementBags" REAL NOT NULL DEFAULT 7.5,
    "concretePremixBags" REAL NOT NULL DEFAULT 108.0,
    "phoneRouseHill" TEXT NOT NULL DEFAULT '02 9629 2299',
    "phoneSouthWindsor" TEXT NOT NULL DEFAULT '02 4574 3299',
    "disclaimerMain" TEXT NOT NULL DEFAULT 'Estimated quantities are only as good as the information supplied. Please input measurements in correct units. Answers rounded up. Not for extremely small areas. Product densities can vary — this is an estimate only.',
    "disclaimerTurf" TEXT NOT NULL DEFAULT 'We recommend at least 5% extra for wastage.',
    "enableSoil" BOOLEAN NOT NULL DEFAULT true,
    "enableSand" BOOLEAN NOT NULL DEFAULT true,
    "enableGravel" BOOLEAN NOT NULL DEFAULT true,
    "enableScoria" BOOLEAN NOT NULL DEFAULT true,
    "enableRoadbase" BOOLEAN NOT NULL DEFAULT true,
    "enableRecycled" BOOLEAN NOT NULL DEFAULT true,
    "enableBluemetal" BOOLEAN NOT NULL DEFAULT true,
    "enableMulch" BOOLEAN NOT NULL DEFAULT true,
    "enableGardenMix" BOOLEAN NOT NULL DEFAULT true,
    "enableConcrete" BOOLEAN NOT NULL DEFAULT true,
    "wastagePercentageTurf" REAL NOT NULL DEFAULT 5,
    "minOrderTonnes" REAL NOT NULL DEFAULT 1,
    "minOrderM3" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("concreteCementBags", "concretePremixBags", "concreteSandMetal", "createdAt", "densityBluemetal", "densityGravel", "densityRecycled", "densityRoadbase", "densitySand", "densityScoria", "densitySoil", "disclaimerMain", "disclaimerTurf", "id", "phoneRouseHill", "phoneSouthWindsor", "shop", "updatedAt") SELECT "concreteCementBags", "concretePremixBags", "concreteSandMetal", "createdAt", "densityBluemetal", "densityGravel", "densityRecycled", "densityRoadbase", "densitySand", "densityScoria", "densitySoil", "disclaimerMain", "disclaimerTurf", "id", "phoneRouseHill", "phoneSouthWindsor", "shop", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
