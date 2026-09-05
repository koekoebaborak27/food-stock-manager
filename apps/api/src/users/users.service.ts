import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { leaveCurrentHouseholdIfMember } from "../household/membership-transition";

// 利用者自身による表示名変更と退会を扱う。
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 表示名を更新する。前後の空白は入口で取り除いた値が渡される。
  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { displayName } });
  }

  // 退会する。所属中なら既存の脱退ルールを適用し、個人情報と全セッションを消す。
  async withdraw(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await leaveCurrentHouseholdIfMember(tx, userId);
      await tx.user.update({
        where: { id: userId },
        data: { displayName: null, email: null, avatarUrl: null },
      });
      await tx.session.deleteMany({ where: { userId } });
    });
  }
}
