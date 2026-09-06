import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { createHouseholdWithAdmin, createUser, cleanDatabase } from "../household/test-fixtures";
import { AppError } from "../common/errors/app-error";
import { NotificationSettingService } from "./notification-setting.service";

/**
 * 対象: notification-setting/NotificationSettingService get・update
 * 目的: 行がない世帯は既定値(8:00)を返すこと、updateがupsertで行を作り、
 *       世帯単位（利用者ごとではない）で共有されることを実DBで担保する。
 */
describe("notification-setting/NotificationSettingService", () => {
  const prisma = new PrismaService();
  const service = new NotificationSettingService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("get", () => {
    it("行がない世帯は既定値(8:00)を返す", async () => {
      const user = await createUser(prisma);
      await createHouseholdWithAdmin(prisma, user.id);

      const result = await service.get(user.id);

      expect(result).toEqual({ hour: 8, minute: 0 });
    });

    it("行がある世帯はその値を返す", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 20, notifyMinute: 30 },
      });

      const result = await service.get(user.id);

      expect(result).toEqual({ hour: 20, minute: 30 });
    });

    it("家族グループに属していない利用者はNO_HOUSEHOLDを投げる", async () => {
      const user = await createUser(prisma);

      await expect(service.get(user.id)).rejects.toMatchObject({
        code: "NO_HOUSEHOLD",
      } as Partial<AppError>);
    });
  });

  describe("update", () => {
    it("行がない世帯は新しく作る", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);

      const result = await service.update(user.id, { hour: 9, minute: 15 });

      expect(result).toEqual({ hour: 9, minute: 15 });
      const setting = await prisma.notificationSetting.findUnique({
        where: { householdId: household.id },
      });
      expect(setting).toMatchObject({ notifyHour: 9, notifyMinute: 15 });
    });

    it("行がある世帯は値を上書きする", async () => {
      const user = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, user.id);
      await prisma.notificationSetting.create({
        data: { householdId: household.id, notifyHour: 8, notifyMinute: 0 },
      });

      const result = await service.update(user.id, { hour: 22, minute: 45 });

      expect(result).toEqual({ hour: 22, minute: 45 });
    });

    it("世帯内の別の利用者が変えても、同じ世帯の設定として共有される", async () => {
      const admin = await createUser(prisma);
      const household = await createHouseholdWithAdmin(prisma, admin.id);
      const member = await createUser(prisma);
      await prisma.membership.create({
        data: { userId: member.id, householdId: household.id, role: "MEMBER" },
      });

      await service.update(admin.id, { hour: 7, minute: 45 });
      const result = await service.get(member.id);

      expect(result).toEqual({ hour: 7, minute: 45 });
    });
  });
});
