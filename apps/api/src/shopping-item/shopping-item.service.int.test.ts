import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { createHouseholdWithAdmin, createUser, cleanDatabase } from "../household/test-fixtures";
import { ShoppingItemService } from "./shopping-item.service";

/**
 * 対象: shopping-item/ShoppingItemService list
 * 目的: 買い物リスト一覧が利用者の家族グループだけを対象にし、削除済みを除くこと、
 *       未購入→購入済みの順・それぞれ作成日時の古い順で並ぶこと、
 *       sourceStockが削除済みならnullとして返すことを実DBで担保する。
 */
describe("shopping-item/ShoppingItemService list", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("家族グループに所属しているとき", () => {
    it("自分の家族グループの未削除の商品だけを、未購入→購入済みの順・各々作成日時の古い順で返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);

      const purchased = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "購入済み商品", isPurchased: true },
      });
      const oldUnpurchased = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "古い未購入商品" },
      });
      const newUnpurchased = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "新しい未購入商品" },
      });
      await prisma.shoppingItem.create({
        data: {
          householdId: household.id,
          name: "削除済み商品",
          deletedAt: new Date(),
        },
      });
      await prisma.shoppingItem.create({
        data: { householdId: otherHousehold.id, name: "別世帯の商品" },
      });

      const result = await service.list(user.id);

      expect(result.items.map((item) => item.id)).toEqual([
        oldUnpurchased.id,
        newUnpurchased.id,
        purchased.id,
      ]);
      expect(result.items.map((item) => item.isPurchased)).toEqual([false, false, true]);
    });

    it("sourceStockが未削除ならその保存区分・消費済かどうかを返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "元の常備食", storageType: "FROZEN" },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "元の常備食", sourceStockId: stock.id },
      });

      const result = await service.list(user.id);

      expect(result.items).toEqual([
        expect.objectContaining({
          id: item.id,
          sourceStockId: stock.id,
          sourceStock: { id: stock.id, storageType: "FROZEN", consumedAt: null },
        }),
      ]);
    });

    it("sourceStockが削除済みならsourceStockをnullで返す（sourceStockIdは保持する）", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "削除済みの元常備食",
          deletedAt: new Date(),
        },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "削除済みの元常備食", sourceStockId: stock.id },
      });

      const result = await service.list(user.id);

      expect(result.items).toEqual([
        expect.objectContaining({ id: item.id, sourceStockId: stock.id, sourceStock: null }),
      ]);
    });
  });

  describe("家族グループに所属していないとき", () => {
    it("AppError(NO_HOUSEHOLD) を投げる", async () => {
      const user = await createUser(prisma);

      await expect(service.list(user.id)).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
    });
  });
});
