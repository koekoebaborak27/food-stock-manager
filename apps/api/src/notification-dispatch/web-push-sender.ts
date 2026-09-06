import { Injectable } from "@nestjs/common";
import webpush, { WebPushError } from "web-push";
import type { NotificationPayload, PushSender, PushSubscriptionTarget } from "./push-sender";

// 送信先の購読情報がもう存在しないことを表す状態コード（40_期限通知/01_期限通知.md 5節）。
const GONE_STATUS_CODES = [404, 410];

// 実際にWeb Pushを送る実装。失敗しても投げ直さず、無効な購読かどうかだけを返す
// （呼び出し側は再送しない。01_Web_Push配信処理.md 4節）。
@Injectable()
export class WebPushSender implements PushSender {
  async send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload,
  ): Promise<{ invalid: boolean }> {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "",
      process.env.VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? "",
    );
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
      return { invalid: false };
    } catch (error) {
      const invalid = error instanceof WebPushError && GONE_STATUS_CODES.includes(error.statusCode);
      return { invalid };
    }
  }
}
