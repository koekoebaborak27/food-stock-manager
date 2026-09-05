import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import {
  clearPersonalInfoAndInvitations,
  detachMember,
  leaveCurrentHouseholdIfMember,
} from "./membership-transition";

export interface HouseholdMember {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
}

export interface HouseholdDetail {
  id: string;
  name: string;
  members: HouseholdMember[];
}

// 家族グループの作成・一覧・脱退・除名・削除。
// 分岐の詳しい根拠は docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md。
@Injectable()
export class HouseholdService {
  constructor(private readonly prisma: PrismaService) {}

  // 呼んだ利用者を管理者として家族グループを作る。すでにどこかへ所属している場合は作らせない。
  async create(userId: string, name: string): Promise<{ id: string; name: string }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({ where: { userId } });
      if (existing) {
        throw Errors.conflict();
      }
      const household = await tx.household.create({ data: { name } });
      await tx.membership.create({ data: { userId, householdId: household.id, role: "ADMIN" } });
      return { id: household.id, name: household.name };
    });
  }

  async getMine(userId: string): Promise<HouseholdDetail> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: membership.householdId },
      include: { memberships: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return {
      id: household.id,
      name: household.name,
      members: household.memberships.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
    };
  }

  // 自己脱退。家族グループに属していなければ NO_HOUSEHOLD とする。
  async leave(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({ where: { userId } });
      if (!membership) {
        throw Errors.noHousehold();
      }
      await leaveCurrentHouseholdIfMember(tx, userId);
    });
  }

  // 除名。管理者だけが、自分以外のメンバーに対して呼べる。
  async removeMember(actingUserId: string, targetUserId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const actingMembership = await tx.membership.findUnique({ where: { userId: actingUserId } });
      if (!actingMembership || actingMembership.role !== "ADMIN" || targetUserId === actingUserId) {
        throw new AppError("LAST_ADMIN_CANNOT_BE_REMOVED", HttpStatus.FORBIDDEN);
      }
      const targetMembership = await tx.membership.findUnique({ where: { userId: targetUserId } });
      if (!targetMembership || targetMembership.householdId !== actingMembership.householdId) {
        throw Errors.notFound();
      }
      await detachMember(tx, targetUserId);
    });
  }

  // 家族グループの削除。管理者だけが呼べる。
  async remove(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({ where: { userId } });
      if (!membership || membership.role !== "ADMIN") {
        throw new AppError("LAST_ADMIN_CANNOT_BE_REMOVED", HttpStatus.FORBIDDEN);
      }
      const members = await tx.membership.findMany({
        where: { householdId: membership.householdId },
      });
      for (const member of members) {
        await clearPersonalInfoAndInvitations(tx, member.userId);
      }
      await tx.household.delete({ where: { id: membership.householdId } });
    });
  }
}
