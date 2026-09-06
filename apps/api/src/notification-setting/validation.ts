import { HttpStatus } from "@nestjs/common";
import { AppError } from "../common/errors/app-error";

// 選べる分は0・15・30・45の4つだけ（Cloud Schedulerが15分ごとにしか配信を起動しないため。
// 02_基本設計/40_期限通知/00_期限通知共通.md 5節）。
const ALLOWED_MINUTES = [0, 15, 30, 45];

export interface NotificationTimeInput {
  hour: number;
  minute: number;
}

// 通知時刻の入力を確かめる。hourは0〜23の整数、minuteは0/15/30/45のみ許す。
// 崩れている場合はこの機能だけのcode（NOTIFICATION_TIME_INVALID）にする
// （02_基本設計/40_期限通知/02_API.md 2節）。
export function validateNotificationTimeInput(
  body: Record<string, unknown>,
): NotificationTimeInput {
  const { hour, minute } = body;
  if (
    typeof hour !== "number" ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    typeof minute !== "number" ||
    !ALLOWED_MINUTES.includes(minute)
  ) {
    throw notificationTimeInvalid();
  }
  return { hour, minute };
}

function notificationTimeInvalid(): AppError {
  return new AppError("NOTIFICATION_TIME_INVALID", HttpStatus.BAD_REQUEST);
}
