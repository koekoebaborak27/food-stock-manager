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
      // membershipはuserIdごとに1件しか持てない（1人1家族グループ）ので、
      // 行があるかどうかだけで所属済みかを判定できる。
      const existing = await tx.membership.findUnique({ where: { userId } });
      if (existing) {
        throw Errors.conflict();
      }
      // 家族グループの箱を先に作り、
      const household = await tx.household.create({ data: { name } });
      // 作成した利用者をそのグループの管理者として所属させる。
      await tx.membership.create({ data: { userId, householdId: household.id, role: "ADMIN" } });
      return { id: household.id, name: household.name };
    });
  }

  // 呼んだ利用者が今所属している家族グループと、そのメンバー一覧を返す。
  // どこにも所属していない場合は NO_HOUSEHOLD とする。
  async getMine(userId: string): Promise<HouseholdDetail> {
    // membershipは「利用者→今の所属先」の対応表。まずここからhouseholdIdを引く。
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }
    // 家族グループ本体と、そのメンバー（利用者情報込み）を一度に取得する。
    // メンバー一覧は招待順（作成日時の古い順）に並べる。
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
      // 所属していない利用者が脱退しようとしていないかだけをここで確認する。
      const membership = await tx.membership.findUnique({ where: { userId } });
      if (!membership) {
        throw Errors.noHousehold();
      }
      // 実際に抜ける処理はmembership-transition.tsに委譲している。
      // 非管理者はそのまま抜けるだけ、管理者は他にメンバーがいる間は抜けられず、
      // 自分だけになった場合はグループごと削除される。
      await leaveCurrentHouseholdIfMember(tx, userId);
    });
  }

  // 除名。管理者だけが、自分以外のメンバーに対して呼べる。
  // 「自分自身への除名」も権限エラーと同じ扱いにすることで、管理者が誤って自分を
  // 除名する操作（実質は脱退や削除であるべき）を弾いている。
  async removeMember(actingUserId: string, targetUserId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 実行者の所属・権限を取得する。所属していない、管理者でない、
      // 対象が自分自身のいずれかであれば権限エラーとして弾く。
      const actingMembership = await tx.membership.findUnique({ where: { userId: actingUserId } });
      if (!actingMembership || actingMembership.role !== "ADMIN" || targetUserId === actingUserId) {
        throw new AppError("LAST_ADMIN_CANNOT_BE_REMOVED", HttpStatus.FORBIDDEN);
      }
      // 除名対象が呼んだ利用者と同じ家族グループにいなければ、除名できる相手が
      // そもそも存在しないのでNOT_FOUNDとする。
      const targetMembership = await tx.membership.findUnique({ where: { userId: targetUserId } });
      if (!targetMembership || targetMembership.householdId !== actingMembership.householdId) {
        throw Errors.notFound();
      }
      // 対象のmembershipを削除し、個人情報と招待コードも合わせて消す
      // （membership-transition.tsのdetachMember）。
      await detachMember(tx, targetUserId);
    });
  }

  // 家族グループの削除。管理者だけが呼べる。
  // 削除前に、全メンバーの個人情報（表示名・アイコン等）と招待情報を消してから
  // household本体を削除する。退会・除名済みの利用者と同じ後始末をここでも行うことで、
  // 家族グループが消えた後に個人情報だけが残らないようにしている。
  async remove(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 呼んだ利用者がこのグループの管理者であることを確認する。
      const membership = await tx.membership.findUnique({ where: { userId } });
      if (!membership || membership.role !== "ADMIN") {
        throw new AppError("LAST_ADMIN_CANNOT_BE_REMOVED", HttpStatus.FORBIDDEN);
      }
      // 削除対象グループの全メンバーを洗い出し、
      const members = await tx.membership.findMany({
        where: { householdId: membership.householdId },
      });
      // 一人ずつ個人情報（表示名・メール・アイコン）と招待コードを消しておく。
      // membership行自体はこの後のhousehold.deleteでカスケード削除される。
      for (const member of members) {
        await clearPersonalInfoAndInvitations(tx, member.userId);
      }
      await tx.household.delete({ where: { id: membership.householdId } });
    });
  }
}
