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
