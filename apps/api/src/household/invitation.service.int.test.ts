import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { InvitationService } from "./invitation.service";
import { addMember, cleanDatabase, createHouseholdWithAdmin, createUser } from "./test-fixtures";

/**
 * 対象: household/InvitationService
 * 目的: 招待コードの発行・再表示・参加の業務ルール（有効期限・使い回し防止・
 *       参加時の家族グループ切り替え）を実DBで担保する。
 *       docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md 5・6節
 */
describe("household/InvitationService", () => {
  const prisma = new PrismaService();
  const service = new InvitationService(prisma);

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("issueOrShow", () => {
    describe("発行済みの有効なコードが無いとき", () => {
      it("新しくコードを発行する", async () => {
        const admin = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, admin.id);

        const result = await service.issueOrShow(admin.id);

        const invitation = await prisma.invitation.findUnique({
          where: { createdById: admin.id },
        });
        expect(invitation?.code).toBe(result.code);
      });
    });

    describe("発行済みの有効なコードがあるとき", () => {
      it("同じコードをそのまま返し、新規発行しない", async () => {
        const admin = await createUser(prisma);
        await createHouseholdWithAdmin(prisma, admin.id);
        const first = await service.issueOrShow(admin.id);

        const second = await service.issueOrShow(admin.id);

        expect(second.code).toBe(first.code);
        const count = await prisma.invitation.count({ where: { createdById: admin.id } });
        expect(count).toBe(1);
      });
    });

    describe("発行済みのコードが期限切れのとき", () => {
      it("古い行を削除し、新しいコードを発行する", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        await prisma.invitation.create({
          data: {
            householdId: household.id,
            createdById: admin.id,
            code: "expired-code",
            expiresAt: new Date(Date.now() - 1000),
          },
        });

        const result = await service.issueOrShow(admin.id);

        expect(result.code).not.toBe("expired-code");
        const count = await prisma.invitation.count({ where: { createdById: admin.id } });
        expect(count).toBe(1);
      });
    });

    describe("家族グループに属していないとき", () => {
      it("AppError(NO_HOUSEHOLD) を投げる", async () => {
        const user = await createUser(prisma);
        await expect(service.issueOrShow(user.id)).rejects.toMatchObject({
          code: "NO_HOUSEHOLD",
        });
      });
    });
  });

  describe("redeem", () => {
    describe("コードが存在しないとき", () => {
      it("AppError(INVITATION_NOT_FOUND) を投げる", async () => {
        const user = await createUser(prisma);
        await expect(service.redeem(user.id, "no-such-code")).rejects.toMatchObject({
          code: "INVITATION_NOT_FOUND",
        });
      });
    });

    describe("コードの有効期限が切れているとき", () => {
      it("AppError(INVITATION_EXPIRED) を投げる", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        await prisma.invitation.create({
          data: {
            householdId: household.id,
            createdById: admin.id,
            code: "expired-code",
            expiresAt: new Date(Date.now() - 1000),
          },
        });
        const joiner = await createUser(prisma);

        await expect(service.redeem(joiner.id, "expired-code")).rejects.toMatchObject({
          code: "INVITATION_EXPIRED",
        });
      });
    });

    describe("参加する利用者がどの家族グループにも属していないとき", () => {
      it("一般メンバーとして参加し、招待コードを削除する", async () => {
        const admin = await createUser(prisma);
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        const invitation = await prisma.invitation.create({
          data: {
            householdId: household.id,
            createdById: admin.id,
            code: "valid-code",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          },
        });
        const joiner = await createUser(prisma);

        const result = await service.redeem(joiner.id, "valid-code");

        expect(result.householdId).toBe(household.id);
        const membership = await prisma.membership.findUnique({ where: { userId: joiner.id } });
        expect(membership).toMatchObject({ householdId: household.id, role: "MEMBER" });
        const remainingInvitation = await prisma.invitation.findUnique({
          where: { id: invitation.id },
        });
        expect(remainingInvitation).toBeNull();
      });
    });

    describe("参加する利用者がすでに一般メンバーとして別の家族グループに属しているとき", () => {
      it("今の家族グループを抜けてから新しい家族グループに参加する", async () => {
        const oldAdmin = await createUser(prisma);
        const oldHousehold = await createHouseholdWithAdmin(prisma, oldAdmin.id);
        const joiner = await createUser(prisma);
        await addMember(prisma, joiner.id, oldHousehold.id);

        const newAdmin = await createUser(prisma);
        const newHousehold = await createHouseholdWithAdmin(prisma, newAdmin.id);
        await prisma.invitation.create({
          data: {
            householdId: newHousehold.id,
            createdById: newAdmin.id,
            code: "valid-code",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          },
        });

        await service.redeem(joiner.id, "valid-code");

        const membership = await prisma.membership.findUniqueOrThrow({
          where: { userId: joiner.id },
        });
        expect(membership.householdId).toBe(newHousehold.id);
        const oldHouseholdStillExists = await prisma.household.findUnique({
          where: { id: oldHousehold.id },
        });
        expect(oldHouseholdStillExists).not.toBeNull();
      });
    });

    describe("参加する利用者が別の家族グループの管理者で、他のメンバーが残っているとき", () => {
      it("AppError(HOUSEHOLD_HAS_OTHER_MEMBERS) を投げ、参加させない", async () => {
        const oldAdmin = await createUser(prisma);
        const oldHousehold = await createHouseholdWithAdmin(prisma, oldAdmin.id);
        const otherMember = await createUser(prisma);
        await addMember(prisma, otherMember.id, oldHousehold.id);

        const newAdmin = await createUser(prisma);
        const newHousehold = await createHouseholdWithAdmin(prisma, newAdmin.id);
        await prisma.invitation.create({
          data: {
            householdId: newHousehold.id,
            createdById: newAdmin.id,
            code: "valid-code",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          },
        });

        await expect(service.redeem(oldAdmin.id, "valid-code")).rejects.toMatchObject({
          code: "HOUSEHOLD_HAS_OTHER_MEMBERS",
        });
        const membership = await prisma.membership.findUniqueOrThrow({
          where: { userId: oldAdmin.id },
        });
        expect(membership.householdId).toBe(oldHousehold.id);
      });
    });

    describe("すでにその招待コードの家族グループに所属しているとき（自分が発行したコードを自分で使った場合など）", () => {
      it("脱退・再参加をせず、招待コードだけを削除する", async () => {
        const admin = await createUser(prisma, { displayName: "管理者" });
        const household = await createHouseholdWithAdmin(prisma, admin.id);
        await prisma.invitation.create({
          data: {
            householdId: household.id,
            createdById: admin.id,
            code: "self-code",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          },
        });

        const result = await service.redeem(admin.id, "self-code");

        expect(result.householdId).toBe(household.id);
        const membership = await prisma.membership.findUniqueOrThrow({
          where: { userId: admin.id },
        });
        expect(membership).toMatchObject({ householdId: household.id, role: "ADMIN" });
        const user = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
        expect(user.displayName).toBe("管理者");
        const invitation = await prisma.invitation.findUnique({ where: { code: "self-code" } });
        expect(invitation).toBeNull();
      });
    });
  });
});
