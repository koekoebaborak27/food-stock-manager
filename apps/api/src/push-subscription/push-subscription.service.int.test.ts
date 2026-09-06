import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { createUser, cleanDatabase } from "../household/test-fixtures";
import { PushSubscriptionService } from "./push-subscription.service";

/**
 * 対象: push-subscription/PushSubscriptionService isSubscribed・subscribe・unsubscribe
 * 目的: 購読の有無を行の存在で表すこと、subscribeがupsertで置き換えること、
 *       unsubscribeが行が無くても失敗しない（べき等）ことを実DBで担保する。
 */
describe("push-subscription/PushSubscriptionService", () => {
  const prisma = new PrismaService();
  const service = new PushSubscriptionService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("isSubscribed", () => {
    it("行が無ければfalseを返す", async () => {
      const user = await createUser(prisma);

      const result = await service.isSubscribed(user.id);

      expect(result).toBe(false);
    });

    it("行があればtrueを返す", async () => {
      const user = await createUser(prisma);
      await prisma.pushSubscription.create({
        data: { userId: user.id, endpoint: "https://push.example.com/a", p256dh: "p", auth: "a" },
      });

      const result = await service.isSubscribed(user.id);

      expect(result).toBe(true);
    });
  });

  describe("subscribe", () => {
    it("行が無ければ新しく作る", async () => {
      const user = await createUser(prisma);

      await service.subscribe(user.id, {
        endpoint: "https://push.example.com/new",
        p256dh: "p256dh-1",
        auth: "auth-1",
      });

      const subscription = await prisma.pushSubscription.findUnique({ where: { userId: user.id } });
      expect(subscription).toMatchObject({
        endpoint: "https://push.example.com/new",
        p256dh: "p256dh-1",
        auth: "auth-1",
      });
    });

    it("すでに行があれば新しいendpoint・keysで置き換える", async () => {
      const user = await createUser(prisma);
      await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/old",
          p256dh: "old-p",
          auth: "old-a",
        },
      });

      await service.subscribe(user.id, {
        endpoint: "https://push.example.com/replaced",
        p256dh: "new-p",
        auth: "new-a",
      });

      const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toMatchObject({
        endpoint: "https://push.example.com/replaced",
        p256dh: "new-p",
        auth: "new-a",
      });
    });
  });

  describe("unsubscribe", () => {
    it("行があれば消す", async () => {
      const user = await createUser(prisma);
      await prisma.pushSubscription.create({
        data: { userId: user.id, endpoint: "https://push.example.com/a", p256dh: "p", auth: "a" },
      });

      await service.unsubscribe(user.id);

      const subscription = await prisma.pushSubscription.findUnique({ where: { userId: user.id } });
      expect(subscription).toBeNull();
    });

    it("行が無くても失敗しない（べき等）", async () => {
      const user = await createUser(prisma);

      await expect(service.unsubscribe(user.id)).resolves.toBeUndefined();
    });
  });
});
