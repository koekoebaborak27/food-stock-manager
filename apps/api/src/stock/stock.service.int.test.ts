import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { createHouseholdWithAdmin, createUser, cleanDatabase } from "../household/test-fixtures";
import { StockService } from "./stock.service";

/**
 * 対象: stock/StockService list
 * 目的: 常備食一覧が利用者の家族グループだけを対象にし、削除済み・消費済みを除くことと
 *       保存区分・食品名・並び順による絞り込みを実DBで担保する。
 */
describe("stock/StockService list", () => {
  const prisma = new PrismaService();
  const service = new StockService(prisma);

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
  const service = new StockService(prisma);

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
  const service = new StockService(prisma);

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
  const service = new StockService(prisma);

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
      await prisma.stock.update({ where: { id: stock.id }, data: { quantity: 5 } });

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
