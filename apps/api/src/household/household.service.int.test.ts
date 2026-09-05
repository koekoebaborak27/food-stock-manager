import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { HouseholdService } from "./household.service";
import { addMember, cleanDatabase, createHouseholdWithAdmin, createUser } from "./test-fixtures";

/**
 * 対象: household/HouseholdService
 * 目的: 家族グループの作成・一覧・脱退・除名・削除の業務ルール（管理者判定・
 *       最後の1人の扱い・個人情報のクリア）を実DBで担保する。
 *       docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md
 */
describe("household/HouseholdService", () => {
  const prisma = new PrismaService();
  const service = new HouseholdService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("create", () => {
    it("呼んだ利用者を管理者として家族グループを作る", async () => {
      const user = await createUser(prisma);

      const result = await service.create(user.id, "山田家");

      const membership = await prisma.membership.findUnique({ where: { userId: user.id } });
      expect(membership).toMatchObject({ householdId: result.id, role: "ADMIN" });
    });

    describe("すでに家族グループに所属しているとき", () => {
      it("AppError(CONFLICT) を投げ、新しい家族グループを作らない", async () => {
        const user = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, user.id);

        await expect(service.create(user.id, "別の家")).rejects.toMatchObject({
          code: "CONFLICT",
        });
      });
    });
  });

  describe("getMine", () => {
    it("家族グループの名前とメンバー一覧を返す", async () => {
      const admin = await createUser(prisma, { displayName: "管理者" });
      const household = await createHouseholdWithAdmin(prisma, admin.id, "鈴木家");
      const member = await createUser(prisma, { displayName: "一般" });
      await addMember(prisma, member.id, household.id, "MEMBER");

      const detail = await service.getMine(admin.id);

      expect(detail.name).toBe("鈴木家");
      expect(detail.members).toHaveLength(2);
      expect(detail.members.find((m) => m.userId === admin.id)?.role).toBe("ADMIN");
      expect(detail.members.find((m) => m.userId === member.id)?.role).toBe("MEMBER");
    });

    describe("家族グループに属していないとき", () => {
      it("AppError(NO_HOUSEHOLD) を投げる", async () => {
        const user = await createUser(prisma);
        await expect(service.getMine(user.id)).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
      });
    });
  });

  describe("leave", () => {
    describe("一般メンバーが脱退するとき", () => {
      it("Membershipを削除し、個人情報を空にする。家族グループは残す", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma, { displayName: "抜ける人" });
        await addMember(prisma, member.id, household.id);

        await service.leave(member.id);

        const membership = await prisma.membership.findUnique({ where: { userId: member.id } });
        expect(membership).toBeNull();
        const user = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
        expect(user.displayName).toBeNull();
        const remainingHousehold = await prisma.household.findUnique({
          where: { id: household.id },
        });
        expect(remainingHousehold).not.toBeNull();
      });

      it("発行済みの招待コードがあれば削除する", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma);
        await addMember(prisma, member.id, household.id);
        await prisma.invitation.create({
          data: {
            householdId: household.id,
            createdById: member.id,
            code: "code-1",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          },
        });

        await service.leave(member.id);

        const invitation = await prisma.invitation.findUnique({
          where: { createdById: member.id },
        });
        expect(invitation).toBeNull();
      });
    });

    describe("管理者が脱退するとき、他のメンバーが残っている場合", () => {
      it("AppError(HOUSEHOLD_HAS_OTHER_MEMBERS) を投げ、脱退させない", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma);
        await addMember(prisma, member.id, household.id);

        await expect(service.leave(admin.id)).rejects.toMatchObject({
          code: "HOUSEHOLD_HAS_OTHER_MEMBERS",
        });
        const membership = await prisma.membership.findUnique({ where: { userId: admin.id } });
        expect(membership).not.toBeNull();
      });
    });

    describe("管理者が脱退するとき、他のメンバーがいない場合", () => {
      it("家族グループごと削除する", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);

        await service.leave(admin.id);

        const remainingHousehold = await prisma.household.findUnique({
          where: { id: household.id },
        });
        expect(remainingHousehold).toBeNull();
      });
    });

    describe("家族グループに属していないとき", () => {
      it("AppError(NO_HOUSEHOLD) を投げる", async () => {
        const user = await createUser(prisma);
        await expect(service.leave(user.id)).rejects.toMatchObject({ code: "NO_HOUSEHOLD" });
      });
    });
  });

  describe("removeMember", () => {
    describe("呼んだ利用者が管理者でないとき", () => {
      it("AppError(LAST_ADMIN_CANNOT_BE_REMOVED) を投げる", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member1 = await createUser(prisma);
        const member2 = await createUser(prisma);
        await addMember(prisma, member1.id, household.id);
        await addMember(prisma, member2.id, household.id);

        await expect(service.removeMember(member1.id, member2.id)).rejects.toMatchObject({
          code: "LAST_ADMIN_CANNOT_BE_REMOVED",
        });
      });
    });

    describe("管理者が自分自身を除名しようとしたとき", () => {
      it("AppError(LAST_ADMIN_CANNOT_BE_REMOVED) を投げる", async () => {
        const admin = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, admin.id);

        await expect(service.removeMember(admin.id, admin.id)).rejects.toMatchObject({
          code: "LAST_ADMIN_CANNOT_BE_REMOVED",
        });
      });
    });

    describe("管理者が他の家族グループの利用者を指定したとき", () => {
      it("AppError(NOT_FOUND) を投げる", async () => {
        const admin = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, admin.id);
        const otherAdmin = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, otherAdmin.id);

        await expect(service.removeMember(admin.id, otherAdmin.id)).rejects.toMatchObject({
          code: "NOT_FOUND",
        });
      });
    });

    describe("管理者が一般メンバーを除名するとき", () => {
      it("対象のMembershipを削除し、個人情報を空にする", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma, { displayName: "除名される人" });
        await addMember(prisma, member.id, household.id);

        await service.removeMember(admin.id, member.id);

        const membership = await prisma.membership.findUnique({ where: { userId: member.id } });
        expect(membership).toBeNull();
        const user = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
        expect(user.displayName).toBeNull();
      });
    });
  });

  describe("remove", () => {
    describe("呼んだ利用者が管理者でないとき", () => {
      it("AppError(LAST_ADMIN_CANNOT_BE_REMOVED) を投げる", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma);
        await addMember(prisma, member.id, household.id);

        await expect(service.remove(member.id)).rejects.toMatchObject({
          code: "LAST_ADMIN_CANNOT_BE_REMOVED",
        });
      });
    });

    describe("管理者が削除するとき", () => {
      it("家族グループと全メンバーのMembershipを削除し、全メンバーの個人情報を空にする", async () => {
        const admin = await createUser(prisma, { displayName: "管理者" });
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const member = await createUser(prisma, { displayName: "一般" });
        await addMember(prisma, member.id, household.id);

        await service.remove(admin.id);

        const remainingHousehold = await prisma.household.findUnique({
          where: { id: household.id },
        });
        expect(remainingHousehold).toBeNull();
        const adminMembership = await prisma.membership.findUnique({ where: { userId: admin.id } });
        expect(adminMembership).toBeNull();
        const memberMembership = await prisma.membership.findUnique({
          where: { userId: member.id },
        });
        expect(memberMembership).toBeNull();
        const adminUser = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
        expect(adminUser.displayName).toBeNull();
        const memberUser = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
        expect(memberUser.displayName).toBeNull();
      });
    });
  });
});
