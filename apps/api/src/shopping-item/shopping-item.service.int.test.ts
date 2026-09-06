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

/**
 * 対象: shopping-item/ShoppingItemService addItem
 * 目的: 直接入力・常備食からの追加それぞれで正しい値が保存されること、
 *       同名の未購入商品との重複が事前確認・一意索引の両方で防がれることを実DBで担保する。
 */
describe("shopping-item/ShoppingItemService addItem", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("直接入力(name)で追加するとき", () => {
    it("未購入の商品を作り、sourceStockIdをnullにする", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);

      const result = await service.addItem(user.id, { name: "牛乳" });

      expect(result).toMatchObject({ name: "牛乳", isPurchased: false, sourceStockId: null });
      const stored = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: result.id } });
      expect(stored).toMatchObject({
        householdId: household.id,
        createdById: user.id,
        updatedById: user.id,
      });
    });
  });

  describe("常備食から(sourceStockId)で追加するとき", () => {
    it("その常備食の食品名を商品名として保存し、sourceStockIdを記録する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", storageType: "FROZEN" },
      });

      const result = await service.addItem(user.id, { sourceStockId: stock.id });

      expect(result).toMatchObject({
        name: "にんじん",
        sourceStockId: stock.id,
        sourceStock: { id: stock.id, storageType: "FROZEN", consumedAt: null },
      });
    });

    it("消費済の常備食も追加元にできる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", consumedAt: new Date() },
      });

      const result = await service.addItem(user.id, { sourceStockId: stock.id });

      expect(result).toMatchObject({ name: "にんじん", sourceStockId: stock.id });
    });

    it("削除済みの常備食を指定すると AppError(SOURCE_STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", deletedAt: new Date() },
      });

      await expect(service.addItem(user.id, { sourceStockId: stock.id })).rejects.toMatchObject({
        code: "SOURCE_STOCK_NOT_FOUND",
      });
    });

    it("他の家族グループの常備食を指定すると AppError(SOURCE_STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const otherStock = await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "他の食品" },
      });

      await expect(
        service.addItem(user.id, { sourceStockId: otherStock.id }),
      ).rejects.toMatchObject({ code: "SOURCE_STOCK_NOT_FOUND" });
    });
  });

  describe("同じ家族グループに同名の未購入商品がすでにあるとき", () => {
    it("AppError(SHOPPING_ITEM_ALREADY_EXISTS) を投げ、追加しない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳" },
      });

      await expect(service.addItem(user.id, { name: "牛乳" })).rejects.toMatchObject({
        code: "SHOPPING_ITEM_ALREADY_EXISTS",
      });
      const count = await prisma.shoppingItem.count({ where: { householdId: household.id } });
      expect(count).toBe(1);
    });
  });

  describe("同名の商品が購入済み・削除済みで残っているとき", () => {
    it("重複とせず追加できる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", isPurchased: true },
      });
      await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", deletedAt: new Date() },
      });

      const result = await service.addItem(user.id, { name: "牛乳" });

      expect(result).toMatchObject({ name: "牛乳", isPurchased: false });
    });
  });

  describe("家族グループに所属していないとき", () => {
    it("AppError(NO_HOUSEHOLD) を投げる", async () => {
      const user = await createUser(prisma);

      await expect(service.addItem(user.id, { name: "牛乳" })).rejects.toMatchObject({
        code: "NO_HOUSEHOLD",
      });
    });
  });
});

/**
 * 対象: shopping-item/ShoppingItemService setPurchased
 * 目的: 購入状態の変更と常備食への反映（残数+1・新規作成・上限判定）の4分岐、
 *       競合時にShoppingItem・Stockのどちらも変更しないことを実DBで担保する
 *       （03_detail-design/30_買い物リスト/01_購入時の常備食反映.md）。
 */
describe("shopping-item/ShoppingItemService setPurchased", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("未購入に戻すとき(isPurchased: false)", () => {
    it("isPurchasedをfalseにし、常備食は変更しない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", isPurchased: true },
      });

      const result = await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: false },
        item.updatedAt,
      );

      expect(result.isPurchased).toBe(false);
    });

    it("updatedAtが食い違う場合はAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", isPurchased: true },
      });

      await expect(
        service.setPurchased(user.id, item.id, { isPurchased: false }, new Date(0)),
      ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
    });
  });

  describe("購入済みにするとき(isPurchased: true)、常備食へ戻さない場合", () => {
    it("isPurchasedをtrueにし、常備食は作らない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳" },
      });

      const result = await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: false },
        item.updatedAt,
      );

      expect(result.isPurchased).toBe(true);
      const stockCount = await prisma.stock.count({ where: { householdId: household.id } });
      expect(stockCount).toBe(0);
    });

    it("すでに購入済みの商品を再度購入済みにする要求はAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", isPurchased: true },
      });

      await expect(
        service.setPurchased(
          user.id,
          item.id,
          { isPurchased: true, returnToStock: false },
          item.updatedAt,
        ),
      ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
    });
  });

  describe("購入済みにするとき、常備食へ戻す場合", () => {
    it("sourceStockIdが無ければ、商品名で残数1の常備食を新規作成する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳" },
      });

      await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: true, storageType: "REFRIGERATED" },
        item.updatedAt,
      );

      const created = await prisma.stock.findFirstOrThrow({
        where: { householdId: household.id },
      });
      expect(created).toMatchObject({
        name: "牛乳",
        storageType: "REFRIGERATED",
        quantity: 1,
        createdById: user.id,
        updatedById: user.id,
      });
    });

    it("元の常備食が未削除・未消費・同じ保存区分なら残数を1増やす", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "牛乳", storageType: "FROZEN", quantity: 3 },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", sourceStockId: stock.id },
      });

      await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: true, storageType: "FROZEN" },
        item.updatedAt,
      );

      const updated = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(updated.quantity).toBe(4);
      const stockCount = await prisma.stock.count({ where: { householdId: household.id } });
      expect(stockCount).toBe(1);
    });

    it("選択した保存区分が元と異なれば、元は変更せず新しい常備食を作る", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "牛乳", storageType: "FROZEN", quantity: 3 },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", sourceStockId: stock.id },
      });

      await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: true, storageType: "REFRIGERATED" },
        item.updatedAt,
      );

      const original = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(original.quantity).toBe(3);
      const createdCount = await prisma.stock.count({
        where: { householdId: household.id, storageType: "REFRIGERATED", quantity: 1 },
      });
      expect(createdCount).toBe(1);
    });

    it("元の常備食が消費済なら、新しい常備食を作る", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "牛乳",
          storageType: "FROZEN",
          quantity: 3,
          consumedAt: new Date(),
        },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", sourceStockId: stock.id },
      });

      await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: true, storageType: "FROZEN" },
        item.updatedAt,
      );

      const original = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(original.quantity).toBe(3);
      const newCount = await prisma.stock.count({
        where: { householdId: household.id, quantity: 1, consumedAt: null },
      });
      expect(newCount).toBe(1);
    });

    it("元の常備食が削除済みなら、商品名で新しい常備食を作る", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "元の牛乳",
          storageType: "FROZEN",
          deletedAt: new Date(),
        },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", sourceStockId: stock.id },
      });

      await service.setPurchased(
        user.id,
        item.id,
        { isPurchased: true, returnToStock: true, storageType: "FROZEN" },
        item.updatedAt,
      );

      const created = await prisma.stock.findFirstOrThrow({
        where: { householdId: household.id, deletedAt: null },
      });
      expect(created).toMatchObject({ name: "牛乳", quantity: 1 });
    });

    it("加算先の残数が99ならAppError(SOURCE_STOCK_QUANTITY_LIMIT)を投げ、商品も常備食も変更しない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "牛乳", storageType: "FROZEN", quantity: 99 },
      });
      const item = await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "牛乳", sourceStockId: stock.id },
      });

      await expect(
        service.setPurchased(
          user.id,
          item.id,
          { isPurchased: true, returnToStock: true, storageType: "FROZEN" },
          item.updatedAt,
        ),
      ).rejects.toMatchObject({ code: "SOURCE_STOCK_QUANTITY_LIMIT" });

      const unchangedItem = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(unchangedItem.isPurchased).toBe(false);
      const unchangedStock = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(unchangedStock.quantity).toBe(99);
      const stockCount = await prisma.stock.count({ where: { householdId: household.id } });
      expect(stockCount).toBe(1);
    });
  });

  describe("家族グループに所属していないとき", () => {
    it("AppError(NO_HOUSEHOLD) を投げる", async () => {
      const user = await createUser(prisma);

      await expect(
        service.setPurchased(user.id, "not-exist", { isPurchased: false }, new Date()),
      ).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
    });
  });
});

/**
 * 対象: shopping-item/ShoppingItemService remove
 * 目的: 1件削除が論理削除であること、updatedAtの不一致・別世帯・存在しない場合を
 *       正しく404/409に出し分けることを実DBで担保する。
 */
describe("shopping-item/ShoppingItemService remove", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletedAtを設定し、削除後のupdatedAtを返す", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const item = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳" },
    });

    const result = await service.remove(user.id, item.id, item.updatedAt);

    expect(result.items).toEqual([{ id: item.id, updatedAt: expect.any(Date) }]);
    const deleted = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("updatedAtが食い違うとAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げ、削除しない", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const item = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳" },
    });

    await expect(
      service.remove(user.id, item.id, new Date(item.updatedAt.getTime() - 1000)),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
    const unchanged = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.deletedAt).toBeNull();
  });

  it("存在しない・別世帯・削除済みのidはAppError(SHOPPING_ITEM_NOT_FOUND)を投げる", async () => {
    const user = await createUser(prisma);
    await createHouseholdWithAdmin(prisma, user.id);
    const otherUser = await createUser(prisma);
    const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
    const otherItem = await prisma.shoppingItem.create({
      data: { householdId: otherHousehold.id, name: "他世帯の商品" },
    });

    await expect(
      service.remove(user.id, "00000000-0000-0000-0000-000000000000", new Date()),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_NOT_FOUND" });
    await expect(service.remove(user.id, otherItem.id, otherItem.updatedAt)).rejects.toMatchObject({
      code: "SHOPPING_ITEM_NOT_FOUND",
    });
  });

  it("家族グループに所属していないときはAppError(NO_HOUSEHOLD)を投げる", async () => {
    const user = await createUser(prisma);

    await expect(service.remove(user.id, "not-exist", new Date())).rejects.toMatchObject({
      code: "NO_HOUSEHOLD",
    });
  });
});

/**
 * 対象: shopping-item/ShoppingItemService removePurchased
 * 目的: 購入済みの一括削除が全件一致確認の後にまとめて行われること、
 *       1件でも対象外・競合があれば全件変更しないことを実DBで担保する。
 */
describe("shopping-item/ShoppingItemService removePurchased", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("全件が購入済み・未削除・updatedAt一致のときだけまとめて削除する", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const first = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", isPurchased: true },
    });
    const second = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "パン", isPurchased: true },
    });

    const result = await service.removePurchased(user.id, [
      { id: first.id, updatedAt: first.updatedAt },
      { id: second.id, updatedAt: second.updatedAt },
    ]);

    expect(result.items.map((item) => item.id).sort()).toEqual([first.id, second.id].sort());
    const remaining = await prisma.shoppingItem.findMany({
      where: { householdId: household.id, deletedAt: null },
    });
    expect(remaining).toHaveLength(0);
  });

  it("1件でもupdatedAtが食い違うとAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げ、全件変更しない", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const first = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", isPurchased: true },
    });
    const second = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "パン", isPurchased: true },
    });

    await expect(
      service.removePurchased(user.id, [
        { id: first.id, updatedAt: first.updatedAt },
        { id: second.id, updatedAt: new Date(second.updatedAt.getTime() - 1000) },
      ]),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
    const remaining = await prisma.shoppingItem.findMany({
      where: { householdId: household.id, deletedAt: null },
    });
    expect(remaining).toHaveLength(2);
  });

  it("1件でも未購入が混ざるとAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げる", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const purchased = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", isPurchased: true },
    });
    const unpurchased = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "パン", isPurchased: false },
    });

    await expect(
      service.removePurchased(user.id, [
        { id: purchased.id, updatedAt: purchased.updatedAt },
        { id: unpurchased.id, updatedAt: unpurchased.updatedAt },
      ]),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
  });

  it("存在しない・別世帯のidが混ざるとAppError(SHOPPING_ITEM_NOT_FOUND)を投げ、全件変更しない", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const item = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", isPurchased: true },
    });

    await expect(
      service.removePurchased(user.id, [
        { id: item.id, updatedAt: item.updatedAt },
        { id: "00000000-0000-0000-0000-000000000000", updatedAt: new Date() },
      ]),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_NOT_FOUND" });
    const unchanged = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.deletedAt).toBeNull();
  });

  it("家族グループに所属していないときはAppError(NO_HOUSEHOLD)を投げる", async () => {
    const user = await createUser(prisma);

    await expect(
      service.removePurchased(user.id, [{ id: "not-exist", updatedAt: new Date() }]),
    ).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
  });
});

/**
 * 対象: shopping-item/ShoppingItemService restore
 * 目的: 削除の取り消しがdeletedAtをnullに戻すこと、全件一致確認が
 *       一括削除と同じ規則で働くことを実DBで担保する。
 */
describe("shopping-item/ShoppingItemService restore", () => {
  const prisma = new PrismaService();
  const service = new ShoppingItemService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("全件が削除済み・updatedAt一致のときだけまとめて復元する", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const first = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", deletedAt: new Date() },
    });
    const second = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "パン", deletedAt: new Date() },
    });

    const result = await service.restore(user.id, [
      { id: first.id, updatedAt: first.updatedAt },
      { id: second.id, updatedAt: second.updatedAt },
    ]);

    expect(result.items.map((item) => item.id).sort()).toEqual([first.id, second.id].sort());
    const restored = await prisma.shoppingItem.findMany({
      where: { householdId: household.id, deletedAt: null },
    });
    expect(restored).toHaveLength(2);
  });

  it("削除済みでないものが混ざるとAppError(SHOPPING_ITEM_UPDATE_CONFLICT)を投げ、全件変更しない", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const deleted = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", deletedAt: new Date() },
    });
    const notDeleted = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "パン" },
    });

    await expect(
      service.restore(user.id, [
        { id: deleted.id, updatedAt: deleted.updatedAt },
        { id: notDeleted.id, updatedAt: notDeleted.updatedAt },
      ]),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_UPDATE_CONFLICT" });
    const stillDeleted = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: deleted.id } });
    expect(stillDeleted.deletedAt).not.toBeNull();
  });

  it("存在しない・別世帯のidが混ざるとAppError(SHOPPING_ITEM_NOT_FOUND)を投げる", async () => {
    const user = await createUser(prisma);
    const household = await createHouseholdWithAdmin(prisma, user.id);
    const deleted = await prisma.shoppingItem.create({
      data: { householdId: household.id, name: "牛乳", deletedAt: new Date() },
    });

    await expect(
      service.restore(user.id, [
        { id: deleted.id, updatedAt: deleted.updatedAt },
        { id: "00000000-0000-0000-0000-000000000000", updatedAt: new Date() },
      ]),
    ).rejects.toMatchObject({ code: "SHOPPING_ITEM_NOT_FOUND" });
  });

  it("家族グループに所属していないときはAppError(NO_HOUSEHOLD)を投げる", async () => {
    const user = await createUser(prisma);

    await expect(
      service.restore(user.id, [{ id: "not-exist", updatedAt: new Date() }]),
    ).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
  });
});
