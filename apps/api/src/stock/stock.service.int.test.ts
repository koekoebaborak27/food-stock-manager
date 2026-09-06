import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import {
  addMember,
  createHouseholdWithAdmin,
  createUser,
  cleanDatabase,
} from "../household/test-fixtures";
import { ShoppingItemService } from "../shopping-item/shopping-item.service";
import { StockService } from "./stock.service";

function createStockService(prisma: PrismaService): StockService {
  return new StockService(prisma, new ShoppingItemService(prisma));
}

/**
 * 対象: stock/StockService list
 * 目的: 常備食一覧が利用者の家族グループだけを対象にし、削除済み・消費済みを除くことと
 *       保存区分・食品名・並び順による絞り込みを実DBで担保する。
 */
describe("stock/StockService list", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("家族グループに所属しているとき", () => {
    it("自分の家族グループの未削除・未消費の食品だけを期限が近い順で返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const early = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "早い食品",
          quantity: 2,
          expiresOn: new Date("2026-09-06"),
        },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "期限なし食品", quantity: 1 },
      });
      await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "削除済み食品",
          quantity: 1,
          deletedAt: new Date(),
        },
      });
      await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "消費済み食品",
          quantity: 0,
          consumedAt: new Date(),
        },
      });
      await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "別世帯の食品", quantity: 1 },
      });

      const result = await service.list(user.id, {
        storageType: null,
        keyword: null,
        sort: "EXPIRY",
        urgentOnly: false,
      });

      expect(result.items.map((item) => item.name)).toEqual(["早い食品", "期限なし食品"]);
      expect(result.items[0]).toMatchObject({ id: early.id, quantity: 2, expiresOn: "2026-09-06" });
    });
  });

  describe("保存区分・食品名・名前順を指定したとき", () => {
    it("指定した保存区分の中から食品名を部分一致で絞り、名前順で返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.stock.createMany({
        data: [
          { householdId: household.id, name: "冷凍カレー", storageType: "FROZEN" },
          { householdId: household.id, name: "冷凍カレーパン", storageType: "FROZEN" },
          { householdId: household.id, name: "冷蔵カレー", storageType: "REFRIGERATED" },
        ],
      });

      const result = await service.list(user.id, {
        storageType: "FROZEN",
        keyword: "カレー",
        sort: "NAME",
        urgentOnly: false,
      });

      expect(result.items.map((item) => item.name)).toEqual(["冷凍カレー", "冷凍カレーパン"]);
    });
  });

  describe("家族グループに所属していないとき", () => {
    it("AppError(NO_HOUSEHOLD) を投げる", async () => {
      const user = await createUser(prisma);

      await expect(
        service.list(user.id, {
          storageType: null,
          keyword: null,
          sort: "EXPIRY",
          urgentOnly: false,
        }),
      ).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
    });
  });
});

const validInput = {
  name: "にんじん",
  storageType: "REFRIGERATED" as const,
  quantity: 2,
  unit: "PIECE" as const,
  expiresOn: "2026-09-10",
  isHomemade: true,
  memo: "メモ",
};

/**
 * 対象: stock/StockService get / create / update
 * 目的: 常備食1件の取得・登録・編集が家族グループで絞り込まれ、
 *       登録時の重複名判定と編集時の更新競合をDBで担保する。
 */
describe("stock/StockService get", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("自分の家族グループの食品を指定したとき", () => {
    it("メモを含む1件を返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", memo: "メモ" },
      });

      const result = await service.get(user.id, stock.id);

      expect(result).toMatchObject({ id: stock.id, name: "にんじん", memo: "メモ" });
    });
  });

  describe("他の家族グループの食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const otherStock = await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "他の食品" },
      });

      await expect(service.get(user.id, otherStock.id)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });

  describe("削除済みの食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "削除済み", deletedAt: new Date() },
      });

      await expect(service.get(user.id, stock.id)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });
});

describe("stock/StockService create", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("同じ名前の食品がまだないとき", () => {
    it("食品を作り、duplicateName:falseを返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);

      const result = await service.create(user.id, validInput);

      expect(result).toMatchObject({ name: "にんじん", duplicateName: false });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: result.id } });
      expect(stored).toMatchObject({ householdId: household.id, createdById: user.id });
    });
  });

  describe("同じ家族グループに同じ名前の未削除・未消費の食品がすでにあるとき", () => {
    it("登録は行いduplicateName:trueを返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.stock.create({ data: { householdId: household.id, name: "にんじん" } });

      const result = await service.create(user.id, validInput);

      expect(result.duplicateName).toBe(true);
      const count = await prisma.stock.count({
        where: { householdId: household.id, name: "にんじん" },
      });
      expect(count).toBe(2);
    });
  });

  describe("他の家族グループに同じ名前の食品があるとき", () => {
    it("duplicateName:falseを返す", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      await prisma.stock.create({ data: { householdId: otherHousehold.id, name: "にんじん" } });

      const result = await service.create(user.id, validInput);

      expect(result.duplicateName).toBe(false);
    });
  });
});

describe("stock/StockService update", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("画面が読んだupdatedAtが最新のとき", () => {
    it("内容を書き換え、更新者を記録する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      const result = await service.update(
        user.id,
        stock.id,
        { ...validInput, name: "じゃがいも" },
        stock.updatedAt,
      );

      expect(result).toMatchObject({ name: "じゃがいも", quantity: 2 });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.updatedById).toBe(user.id);
    });
  });

  describe("他の利用者が先に更新していたとき", () => {
    it("保存せずAppError(STOCK_UPDATE_CONFLICT) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });
      const staleUpdatedAt = stock.updatedAt;
      // DBのタイムスタンプは書き込み間隔が短いと同じ値に丸まることがあるため、
      // 「先に更新されていた」状態を確実に作るためupdatedAtを明示的に未来へずらす。
      await prisma.stock.update({
        where: { id: stock.id },
        data: { quantity: 5, updatedAt: new Date(staleUpdatedAt.getTime() + 1000) },
      });

      await expect(
        service.update(user.id, stock.id, validInput, staleUpdatedAt),
      ).rejects.toMatchObject({ code: "STOCK_UPDATE_CONFLICT" });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.quantity).toBe(5);
    });
  });

  describe("他の家族グループの食品を編集しようとしたとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const otherStock = await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "他の食品" },
      });

      await expect(
        service.update(user.id, otherStock.id, validInput, otherStock.updatedAt),
      ).rejects.toMatchObject({ code: "STOCK_NOT_FOUND" });
    });
  });
});

/**
 * 対象: stock/StockService get
 * 目的: 詳細画面が表示する作成者・更新者名を作成・編集の履歴どおりに返すことを担保する。
 */
describe("stock/StockService get 作成者・更新者", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("作成者と更新者が異なるとき", () => {
    it("それぞれの表示名を返す", async () => {
      const creator = await createUser(prisma, { displayName: "作成者" });
      const household = await createHouseholdWithAdmin(prisma, creator.id);
      const updater = await createUser(prisma, { displayName: "更新者" });
      await addMember(prisma, updater.id, household.id);
      const stock = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "にんじん",
          createdById: creator.id,
          updatedById: updater.id,
        },
      });

      const result = await service.get(creator.id, stock.id);

      expect(result).toMatchObject({ createdByName: "作成者", updatedByName: "更新者" });
    });
  });

  describe("作成者が退会しているとき", () => {
    it("createdByNameをnullで返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", createdById: null },
      });

      const result = await service.get(user.id, stock.id);

      expect(result.createdByName).toBeNull();
    });
  });
});

/**
 * 対象: stock/StockService adjustQuantity
 * 目的: 残数の増減が0未満にならないこと、更新の競合を確認しないことをDBで担保する。
 */
describe("stock/StockService adjustQuantity", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("残数が1以上のとき", () => {
    it("-1で残数を1減らし、更新者を記録する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", quantity: 2 },
      });

      const result = await service.adjustQuantity(user.id, stock.id, -1);

      expect(result.quantity).toBe(1);
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.updatedById).toBe(user.id);
    });

    it("+1で残数を1増やす", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", quantity: 2 },
      });

      const result = await service.adjustQuantity(user.id, stock.id, 1);

      expect(result.quantity).toBe(3);
    });
  });

  describe("残数がすでに0のとき", () => {
    it("-1を指定しても0未満にならない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", quantity: 0 },
      });

      const result = await service.adjustQuantity(user.id, stock.id, -1);

      expect(result.quantity).toBe(0);
    });
  });

  describe("他の家族グループの食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const otherStock = await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "他の食品" },
      });

      await expect(service.adjustQuantity(user.id, otherStock.id, 1)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });
});

/**
 * 対象: stock/StockService consume
 * 目的: 消費済にした食品が一覧・消費済リストどちらの問い合わせにも
 *       前提となるconsumedAtを持つこと、addToShoppingListがtrueのときに
 *       買い物リストへの追加（重複時は省略）と組み合わさることを担保する。
 */
describe("stock/StockService consume", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("未消費の食品を指定したとき", () => {
    it("consumedAtを記録し、duplicateShoppingItem:falseを返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      const result = await service.consume(user.id, stock.id, false);

      expect(result).toEqual({ duplicateShoppingItem: false });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.consumedAt).not.toBeNull();
      expect(stored.updatedById).toBe(user.id);
    });
  });

  describe("すでに消費済みの食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", consumedAt: new Date() },
      });

      await expect(service.consume(user.id, stock.id, false)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });

  describe("addToShoppingList:trueを指定したとき", () => {
    it("食品名を商品名として買い物リストへ追加し、sourceStockIdにこの常備食のidを記録する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      const result = await service.consume(user.id, stock.id, true);

      expect(result).toEqual({ duplicateShoppingItem: false });
      const item = await prisma.shoppingItem.findFirstOrThrow({
        where: { householdId: household.id },
      });
      expect(item).toMatchObject({ name: "にんじん", sourceStockId: stock.id, isPurchased: false });
    });

    it("同名の未購入商品がすでにあれば追加を省き、duplicateShoppingItem:trueで消費済への変更は完了する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });
      await prisma.shoppingItem.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      const result = await service.consume(user.id, stock.id, true);

      expect(result).toEqual({ duplicateShoppingItem: true });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.consumedAt).not.toBeNull();
      const count = await prisma.shoppingItem.count({ where: { householdId: household.id } });
      expect(count).toBe(1);
    });
  });
});

/**
 * 対象: stock/StockService remove / restore
 * 目的: 削除は更新の競合を確認し、元に戻すと一覧の問い合わせに再び現れることを担保する。
 */
describe("stock/StockService remove", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("画面が読んだupdatedAtが最新のとき", () => {
    it("deletedAtを記録する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      await service.remove(user.id, stock.id, stock.updatedAt);

      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.deletedAt).not.toBeNull();
    });
  });

  describe("他の利用者が先に更新していたとき", () => {
    it("削除せずAppError(STOCK_UPDATE_CONFLICT) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });
      const staleUpdatedAt = stock.updatedAt;
      // DBのタイムスタンプは書き込み間隔が短いと同じ値に丸まることがあるため、
      // 「先に更新されていた」状態を確実に作るためupdatedAtを明示的に未来へずらす。
      await prisma.stock.update({
        where: { id: stock.id },
        data: { quantity: 5, updatedAt: new Date(staleUpdatedAt.getTime() + 1000) },
      });

      await expect(service.remove(user.id, stock.id, staleUpdatedAt)).rejects.toMatchObject({
        code: "STOCK_UPDATE_CONFLICT",
      });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.deletedAt).toBeNull();
    });
  });
});

describe("stock/StockService restore", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("削除済みの食品を指定したとき", () => {
    it("deletedAtを空に戻す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん", deletedAt: new Date() },
      });

      await service.restore(user.id, stock.id);

      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: stock.id } });
      expect(stored.deletedAt).toBeNull();
    });
  });

  describe("削除されていない食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      await expect(service.restore(user.id, stock.id)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });
});

/**
 * 対象: stock/StockService listConsumed
 * 目的: 消費済リストが利用者の家族グループだけを対象にし、削除済み・未消費を除いて
 *       消費済にした日付の新しい順で返すことを実DBで担保する。
 */
describe("stock/StockService listConsumed", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("家族グループに所属しているとき", () => {
    it("自分の家族グループの消費済食品だけを消費済にした日付の新しい順で返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const older = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "先に消費した食品",
          unit: "PIECE",
          consumedAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
      const newer = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "後で消費した食品",
          consumedAt: new Date("2026-09-05T00:00:00.000Z"),
        },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "未消費の食品" },
      });
      await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "削除済みの消費済食品",
          deletedAt: new Date(),
          consumedAt: new Date(),
        },
      });
      await prisma.stock.create({
        data: {
          householdId: otherHousehold.id,
          name: "別世帯の消費済食品",
          consumedAt: new Date(),
        },
      });

      const result = await service.listConsumed(user.id);

      expect(result.items.map((item) => item.name)).toEqual([
        "後で消費した食品",
        "先に消費した食品",
      ]);
      expect(result.items[1]).toMatchObject({ id: older.id, unit: "PIECE" });
      expect(result.items[0]).toMatchObject({ id: newer.id, unit: null });
    });
  });
});

/**
 * 対象: stock/StockService reRegister
 * 目的: 消費済食品の食品名・保存区分・単位だけを引き継ぎ、残数1・期限なしの
 *       新しい常備食を作ることを実DBで担保する。
 */
describe("stock/StockService reRegister", () => {
  const prisma = new PrismaService();
  const service = createStockService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("自分の家族グループの消費済食品を指定したとき", () => {
    it("食品名・保存区分・単位を引き継ぎ、残数1・期限なしの新しい行を作る", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const consumed = await prisma.stock.create({
        data: {
          householdId: household.id,
          name: "にんじん",
          storageType: "FROZEN",
          unit: "BAG",
          quantity: 0,
          isHomemade: true,
          memo: "メモ",
          expiresOn: new Date("2026-09-01"),
          consumedAt: new Date(),
        },
      });

      const created = await service.reRegister(user.id, consumed.id);

      expect(created).toMatchObject({
        name: "にんじん",
        storageType: "FROZEN",
        unit: "BAG",
        quantity: 1,
        expiresOn: null,
        isHomemade: false,
        memo: null,
      });
      const stored = await prisma.stock.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.householdId).toBe(household.id);
      expect(stored.createdById).toBe(user.id);
      // 元の消費済食品はそのまま残り、消費済リストからも消えない。
      const original = await prisma.stock.findUniqueOrThrow({ where: { id: consumed.id } });
      expect(original.consumedAt).not.toBeNull();
    });
  });

  describe("未消費の食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      const stock = await prisma.stock.create({
        data: { householdId: household.id, name: "にんじん" },
      });

      await expect(service.reRegister(user.id, stock.id)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });

  describe("他の家族グループの消費済食品を指定したとき", () => {
    it("AppError(STOCK_NOT_FOUND) を投げる", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);
      const otherUser = await createUser(prisma);
      const otherHousehold = await createHouseholdWithAdmin(prisma, otherUser.id);
      const stock = await prisma.stock.create({
        data: { householdId: otherHousehold.id, name: "にんじん", consumedAt: new Date() },
      });

      await expect(service.reRegister(user.id, stock.id)).rejects.toMatchObject({
        code: "STOCK_NOT_FOUND",
      });
    });
  });
});
