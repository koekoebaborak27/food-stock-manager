import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import {
  computeInvitationExpiry,
  generateInvitationCode,
  isInvitationExpired,
} from "./invitation-code";
import { leaveCurrentHouseholdIfMember } from "./membership-transition";

export interface InvitationView {
  code: string;
  expiresAt: Date;
}

// 招待コードの発行・再表示・参加。
// 分岐の詳しい根拠は docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md 5・6節。
@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  // 有効な招待コードがあればそれを返し、無ければ新規に発行する。
  async issueOrShow(userId: string): Promise<InvitationView> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }

    const existing = await this.prisma.invitation.findUnique({ where: { createdById: userId } });
    const now = new Date();
    if (existing && !isInvitationExpired(existing.expiresAt, now)) {
      return { code: existing.code, expiresAt: existing.expiresAt };
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.invitation.deleteMany({ where: { id: existing.id } });
      }
      const invitation = await tx.invitation.create({
        data: {
          householdId: membership.householdId,
          createdById: userId,
          code: generateInvitationCode(),
          expiresAt: computeInvitationExpiry(now),
        },
      });
      return { code: invitation.code, expiresAt: invitation.expiresAt };
    });
  }

  // 招待コードで参加する。すでに家族グループに属している場合は、参加の前に今の家族グループから外れる。
  async redeem(userId: string, code: string): Promise<{ householdId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { code } });
      if (!invitation) {
        throw new AppError("INVITATION_NOT_FOUND", HttpStatus.NOT_FOUND);
      }
      if (isInvitationExpired(invitation.expiresAt, new Date())) {
        throw new AppError("INVITATION_EXPIRED", HttpStatus.NOT_FOUND);
      }

      // すでにこの招待コードの家族グループに所属している場合は、参加処理そのものをせず
      // コードの削除だけ行う。脱退→再参加をすると、管理者が自分1人しかいないときに
      // 家族グループを削除したうえで消えたIDへ参加させようとして失敗するため。
      const currentMembership = await tx.membership.findUnique({ where: { userId } });
      if (currentMembership?.householdId !== invitation.householdId) {
        await leaveCurrentHouseholdIfMember(tx, userId);
        await tx.membership.create({
          data: { userId, householdId: invitation.householdId, role: "MEMBER" },
        });
      }
      await tx.invitation.deleteMany({ where: { id: invitation.id } });

      return { householdId: invitation.householdId };
    });
  }
}
