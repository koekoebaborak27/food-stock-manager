import { HttpStatus } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AppError } from "../common/errors/app-error";

export type Tx = Prisma.TransactionClient;

// 1節: 利用者を家族グループから外す共通処理。
// docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md
export async function detachMember(tx: Tx, userId: string): Promise<void> {
  await tx.membership.delete({ where: { userId } });
  await clearPersonalInfoAndInvitations(tx, userId);
}

// 家族グループそのものを削除するときは、Membership行はカスケード削除に任せ、
// 個人情報のクリアと招待コードの削除だけを先に行う。
export async function clearPersonalInfoAndInvitations(tx: Tx, userId: string): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { displayName: null, email: null, avatarUrl: null },
  });
  await tx.invitation.deleteMany({ where: { createdById: userId } });
}

// 2節・5節共通: 今の家族グループから外れる。
// 管理者が他のメンバーを残したままでは外れられない。
// 家族グループに属していない場合は何もしない（招待コード参加時の切り替えで、
// 参加前に呼んでも所属していないときはそのまま素通りさせるため）。
export async function leaveCurrentHouseholdIfMember(tx: Tx, userId: string): Promise<void> {
  const membership = await tx.membership.findUnique({ where: { userId } });
  if (!membership) {
    return;
  }

  if (membership.role !== "ADMIN") {
    await detachMember(tx, userId);
    return;
  }

  const othersCount = await tx.membership.count({
    where: { householdId: membership.householdId, userId: { not: userId } },
  });
  if (othersCount > 0) {
    throw new AppError("HOUSEHOLD_HAS_OTHER_MEMBERS", HttpStatus.CONFLICT);
  }

  await detachMember(tx, userId);
  await tx.household.delete({ where: { id: membership.householdId } });
}
