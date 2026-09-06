-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "sourceStockId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingItem_householdId_deletedAt_isPurchased_name_idx" ON "ShoppingItem"("householdId", "deletedAt", "isPurchased", "name");

-- CreateIndex
-- 同じ世帯・未購入・未削除の商品名を重複させない部分一意索引。
-- Prismaのschema.prismaはWHERE条件付きの一意制約を表現できないため、ここへ手で足す
-- （docs/specs/03_detail-design/30_買い物リスト/02_重複判定と一括操作の整合性.md 1節）。
CREATE UNIQUE INDEX "ShoppingItem_household_name_unpurchased_key" ON "ShoppingItem"("householdId", "name") WHERE "isPurchased" = false AND "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_sourceStockId_fkey" FOREIGN KEY ("sourceStockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
