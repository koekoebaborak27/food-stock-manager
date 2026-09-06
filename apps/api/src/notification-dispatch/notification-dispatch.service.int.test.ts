import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import {
  addMember,
  createHouseholdWithAdmin,
  createUser,
  cleanDatabase,
} from "../household/test-fixtures";
import { ShoppingItemService } from "../shopping-item/shopping-item.service";
import { StockService } from "../stock/stock.service";
import { NotificationDispatchService } from "./notification-dispatch.service";
import type { NotificationPayload, PushSender, PushSubscriptionTarget } from "./push-sender";

// 実際には送信しない偽の送信手段。呼ばれた内容を記録し、指定したid宛だけinvalid: trueを返す。
class FakePushSender implements PushSender {
  calls: Array<{ subscription: PushSubscriptionTarget; payload: NotificationPayload }> = [];

  constructor(private readonly invalidSubscriptionIds: Set<string> = new Set()) {}

  async send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload,
  ): Promise<{ invalid: boolean }> {
    this.calls.push({ subscription, payload });
    return { invalid: this.invalidSubscriptionIds.has(subscription.id) };
  }
}

function createDispatchService(
  prisma: PrismaService,
  pushSender: PushSender,
): NotificationDispatchService {
  const stocks = new StockService(prisma, new ShoppingItemService(prisma));
  return new NotificationDispatchService(prisma, stocks, pushSender);
}

async function createSubscription(prisma: PrismaService, userId: string) {
  return prisma.pushSubscription.create({
    data: { userId, endpoint: `https://push.example.com/${userId}`, p256dh: "p", auth: "a" },
  });
}

/**
 * 対象: notification-dispatch/NotificationDispatchService dispatch
 * 目的: 通知時刻が現在の枠と一致し今日まだ配信していない世帯だけを対象にすること、
 *       行が無い世帯は既定値(8:00)の枠でだけ対象にすること、二重配信を防ぐこと、
 *       対象件数が0件なら送信しないこと、無効な購読を削除することを実DBで担保する。
 */
describe("notification-dispatch/NotificationDispatchService dispatch", () => {
  const prisma = new PrismaService();
  const now = new Date("2026-09-06T00:00:00.000Z"); // 日本時間 2026-09-06 09:00（枠: 9:00）
  const defaultSlotNow = new Date("2026-09-05T23:00:00.000Z"); // 日本時間 2026-09-06 08:00（枠: 8:00）
  const today = new Date("2026-09-06T00:00:00.000Z");

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("通知時刻が現在の枠と一致し、まだ配信していない世帯があるとき", () => {
    it("件数を数えて配信し、lastNotifiedOnを今日にする", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 9, notifyMinute: 0 },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const result = await service.dispatch(now);

      expect(result).toEqual({ processedHouseholds: 1, notifiedHouseholds: 1 });
      expect(pushSender.calls).toHaveLength(1);
      expect(pushSender.calls[0].payload).toEqual({
        title: "期限が近い食品があります",
        body: "期限切れ・期限間近の食品が1件あります。",
        url: "/?urgentOnly=true",
      });
      const setting = await prisma.notificationSetting.findUniqueOrThrow({
        where: { householdId: household.id },
      });
      expect(setting.lastNotifiedOn).toEqual(today);
    });
  });

  describe("同じ日にすでに配信済みの世帯があるとき", () => {
    it("対象にせず、送信しない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 9, notifyMinute: 0, lastNotifiedOn: today },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const result = await service.dispatch(now);

      expect(result).toEqual({ processedHouseholds: 0, notifiedHouseholds: 0 });
      expect(pushSender.calls).toHaveLength(0);
    });
  });

  describe("通知時刻が現在の枠と一致しない世帯があるとき", () => {
    it("対象にしない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 20, notifyMinute: 0 },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const result = await service.dispatch(now);

      expect(result).toEqual({ processedHouseholds: 0, notifiedHouseholds: 0 });
    });
  });

  describe("対象件数が0件の世帯があるとき", () => {
    it("世帯は確保するが送信しない", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 9, notifyMinute: 0 },
      });
      await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const result = await service.dispatch(now);

      expect(result).toEqual({ processedHouseholds: 1, notifiedHouseholds: 0 });
      expect(pushSender.calls).toHaveLength(0);
    });
  });

  describe("NotificationSetting行が無い世帯があるとき", () => {
    it("枠が既定値(8:00)と一致するときだけ対象にする", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const notAtDefaultSlot = await service.dispatch(now);
      expect(notAtDefaultSlot).toEqual({ processedHouseholds: 0, notifiedHouseholds: 0 });

      const atDefaultSlot = await service.dispatch(defaultSlotNow);
      expect(atDefaultSlot).toEqual({ processedHouseholds: 1, notifiedHouseholds: 1 });
      const setting = await prisma.notificationSetting.findUniqueOrThrow({
        where: { householdId: household.id },
      });
      expect(setting).toMatchObject({ notifyHour: 8, notifyMinute: 0, lastNotifiedOn: today });
    });
  });

  describe("世帯に所属する複数の利用者が通知を有効にしているとき", () => {
    it("それぞれに1通ずつ送る", async () => {
      const admin = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, admin.id);
      const member = await createUser(prisma);
      await addMember(prisma, member.id, household.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 9, notifyMinute: 0 },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      await createSubscription(prisma, admin.id);
      await createSubscription(prisma, member.id);
      const pushSender = new FakePushSender();
      const service = createDispatchService(prisma, pushSender);

      const result = await service.dispatch(now);

      expect(result).toEqual({ processedHouseholds: 1, notifiedHouseholds: 1 });
      expect(pushSender.calls).toHaveLength(2);
    });
  });

  describe("送信先の購読情報がもう無効だったとき", () => {
    it("そのPushSubscription行を削除する", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 9, notifyMinute: 0 },
      });
      await prisma.stock.create({
        data: { householdId: household.id, name: "今日が期限", expiresOn: new Date("2026-09-06") },
      });
      const subscription = await createSubscription(prisma, user.id);
      const pushSender = new FakePushSender(new Set([subscription.id]));
      const service = createDispatchService(prisma, pushSender);

      await service.dispatch(now);

      const remaining = await prisma.pushSubscription.findUnique({
        where: { id: subscription.id },
      });
      expect(remaining).toBeNull();
    });
  });
});
