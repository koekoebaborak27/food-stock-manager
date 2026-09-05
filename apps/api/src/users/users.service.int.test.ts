import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import {
  addMember,
  cleanDatabase,
  createHouseholdWithAdmin,
  createUser,
} from "../household/test-fixtures";
import { UsersService } from "./users.service";

/**
 * 対象: users/UsersService
 * 目的: 表示名の変更と退会時の個人情報・所属・セッションの扱いを実DBで担保する。
 */
describe("users/UsersService", () => {
  const prisma = new PrismaService();
  const service = new UsersService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("updateDisplayName", () => {
    it("表示名を変更する", async () => {
      const user = await createUser(prisma, { displayName: "変更前" });

      await service.updateDisplayName(user.id, "変更後");

      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        displayName: "変更後",
      });
    });
  });

  describe("withdraw", () => {
    describe("家族グループに所属していないとき", () => {
      it("個人情報と全セッションを消し、User行は残す", async () => {
        const user = await createUser(prisma, { displayName: "退会する人" });
        await prisma.session.create({
          data: {
            userId: user.id,
            tokenHash: `session-${user.id}`,
            expiresAt: new Date(Date.now() + 60_000),
          },
        });

        await service.withdraw(user.id);

        await expect(
          prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
        ).resolves.toMatchObject({
          displayName: null,
          email: null,
          avatarUrl: null,
        });
        await expect(prisma.session.count({ where: { userId: user.id } })).resolves.toBe(0);
      });
    });

    describe("一般メンバーが退会するとき", () => {
      it("家族グループから外れ、家族グループは残す", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma);
        await addMember(prisma, member.id, household.id);

        await service.withdraw(member.id);

        await expect(
          prisma.membership.findUnique({ where: { userId: member.id } }),
        ).resolves.toBeNull();
        await expect(
          prisma.household.findUnique({ where: { id: household.id } }),
        ).resolves.not.toBeNull();
      });
    });

    describe("管理者が他のメンバーを残して退会するとき", () => {
      it("AppError(HOUSEHOLD_HAS_OTHER_MEMBERS) を投げ、個人情報を残す", async () => {
        const admin = await createUser(prisma, { displayName: "管理者" });
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma);
        await addMember(prisma, member.id, household.id);

        await expect(service.withdraw(admin.id)).rejects.toMatchObject({
          code: "HOUSEHOLD_HAS_OTHER_MEMBERS",
        });
        await expect(
          prisma.user.findUniqueOrThrow({ where: { id: admin.id } }),
        ).resolves.toMatchObject({
          displayName: "管理者",
        });
      });
    });
  });
});
