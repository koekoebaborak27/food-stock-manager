-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('PIECE', 'BAG', 'PACK', 'SERVING', 'BOTTLE', 'GOTO');

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageType" "StorageType" NOT NULL DEFAULT 'REFRIGERATED',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" "UnitType",
    "expiresOn" DATE,
    "isHomemade" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stock_householdId_idx" ON "Stock"("householdId");

-- CreateIndex
CREATE INDEX "Stock_householdId_deletedAt_consumedAt_expiresOn_idx" ON "Stock"("householdId", "deletedAt", "consumedAt", "expiresOn");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
