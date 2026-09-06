import { Injectable } from "@nestjs/common";
import type { Membership } from "@prisma/client";
import { Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { NotificationTimeInput } from "./validation";

// 既定の通知時刻。行が存在しない世帯はこの値として扱う（01_データベース.md 2節）。
// 配信バッチ（notification-dispatch）も、行が無い世帯を対象にするかどうかの判定に使う。
export const DEFAULT_NOTIFICATION_TIME = { hour: 8, minute: 0 };

export interface NotificationTime {
  hour: number;
  minute: number;
}

// 世帯単位の通知時刻を読み書きする。
@Injectable()
export class NotificationSettingService {
  constructor(private readonly prisma: PrismaService) {}

  // 通知時刻を返す。行がなければ既定値（8:00）を返す。
  async get(userId: string): Promise<NotificationTime> {
    const membership = await this.getMembership(userId);
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { householdId: membership.householdId },
    });
    if (!setting) {
      return DEFAULT_NOTIFICATION_TIME;
    }
    return { hour: setting.notifyHour, minute: setting.notifyMinute };
  }

  // 通知時刻を変える。行がなければ作る（upsert）。
  async update(userId: string, input: NotificationTimeInput): Promise<NotificationTime> {
    const membership = await this.getMembership(userId);
    const setting = await this.prisma.notificationSetting.upsert({
      where: { householdId: membership.householdId },
      create: {
        householdId: membership.householdId,
        notifyHour: input.hour,
        notifyMinute: input.minute,
      },
      update: {
        notifyHour: input.hour,
        notifyMinute: input.minute,
      },
    });
    return { hour: setting.notifyHour, minute: setting.notifyMinute };
  }

  private async getMembership(userId: string): Promise<Membership> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }
    return membership;
  }
}
