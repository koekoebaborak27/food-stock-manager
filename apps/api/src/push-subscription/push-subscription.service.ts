import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { PushSubscriptionInput } from "./validation";

// 端末の通知購読を読み書きする。householdIdは持たず利用者に直接ひも付く
// （01_データベース.md 1節）。配信時はUser→Membershipをたどって世帯を判定する。
@Injectable()
export class PushSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  // 通知を受け取るかどうかは、この行の有無で表す。
  async isSubscribed(userId: string): Promise<boolean> {
    const subscription = await this.prisma.pushSubscription.findUnique({ where: { userId } });
    return subscription !== null;
  }

  // 購読を登録する。すでにあれば新しいendpoint・keysで置き換える（upsert）。
  async subscribe(userId: string, input: PushSubscriptionInput): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });
  }

  // 購読を解除する。もともと無くても失敗にしない（べき等）。
  async unsubscribe(userId: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId } });
  }
}
