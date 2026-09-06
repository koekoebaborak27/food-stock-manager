import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StockService } from "../stock/stock.service";
import { DEFAULT_NOTIFICATION_TIME } from "../notification-setting/notification-setting.service";
import { PUSH_SENDER, type PushSender } from "./push-sender";
import { toNotificationSlot } from "./notification-slot";

const UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";

export interface DispatchResult {
  processedHouseholds: number;
  notifiedHouseholds: number;
}

// 期限通知の配信バッチ（POST /api/internal/notifications/dispatch）の本体。
// 手順は docs/specs/03_detail-design/40_期限通知/01_Web_Push配信処理.md のとおり。
@Injectable()
export class NotificationDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocks: StockService,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  async dispatch(now = new Date()): Promise<DispatchResult> {
    const slot = toNotificationSlot(now);
    const householdIds = await this.claimHouseholds(slot);

    let notifiedHouseholds = 0;
    for (const householdId of householdIds) {
      const urgentCount = await this.stocks.countUrgent(householdId, now);
      if (urgentCount === 0) {
        continue;
      }
      await this.notifyHousehold(householdId, urgentCount);
      notifiedHouseholds += 1;
    }

    return { processedHouseholds: householdIds.length, notifiedHouseholds };
  }

  // 通知時刻が現在の枠と一致し、今日まだ配信していない世帯のIDを確保する（1節）。
  // 確認とlastNotifiedOnの書き換えを1つの条件付き更新にまとめることで、この処理が
  // 重ねて動いても世帯ごとに一度しか確保できないようにする。
  private async claimHouseholds(slot: ReturnType<typeof toNotificationSlot>): Promise<string[]> {
    const claimed: string[] = [];

    const matching = await this.prisma.notificationSetting.findMany({
      where: { notifyHour: slot.hour, notifyMinute: slot.minute },
      select: { householdId: true },
    });
    for (const { householdId } of matching) {
      const result = await this.prisma.notificationSetting.updateMany({
        where: {
          householdId,
          notifyHour: slot.hour,
          notifyMinute: slot.minute,
          OR: [{ lastNotifiedOn: null }, { lastNotifiedOn: { not: slot.date } }],
        },
        data: { lastNotifiedOn: slot.date },
      });
      if (result.count === 1) {
        claimed.push(householdId);
      }
    }

    const isDefaultSlot =
      slot.hour === DEFAULT_NOTIFICATION_TIME.hour &&
      slot.minute === DEFAULT_NOTIFICATION_TIME.minute;
    if (isDefaultSlot) {
      const withoutSetting = await this.prisma.household.findMany({
        where: { notificationSetting: null },
        select: { id: true },
      });
      for (const { id: householdId } of withoutSetting) {
        try {
          await this.prisma.notificationSetting.create({
            data: {
              householdId,
              notifyHour: DEFAULT_NOTIFICATION_TIME.hour,
              notifyMinute: DEFAULT_NOTIFICATION_TIME.minute,
              lastNotifiedOn: slot.date,
            },
          });
          claimed.push(householdId);
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === UNIQUE_CONSTRAINT_ERROR_CODE
          ) {
            // 別の配信処理が先に行を作っていた。確保できなかったので何もしない。
            continue;
          }
          throw error;
        }
      }
    }

    return claimed;
  }

  // 確保できた世帯に属し、通知を有効にしている利用者全員へ1通ずつ送る（4節）。
  private async notifyHousehold(householdId: string, urgentCount: number): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { user: { memberships: { some: { householdId } } } },
    });

    const payload = {
      title: "期限が近い食品があります",
      body: `期限切れ・期限間近の食品が${urgentCount}件あります。`,
      url: "/?urgentOnly=true",
    };

    for (const subscription of subscriptions) {
      const result = await this.pushSender.send(subscription, payload);
      if (result.invalid) {
        // deleteManyは対象が無くても失敗しない（他の処理が先に消していた場合も含む）。
        await this.prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
      }
    }
  }
}
