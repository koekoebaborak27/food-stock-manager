"use client";

import { clientApiFetch } from "@/shared/api/client-fetch";
import type { NotificationTime } from "./types";

// 世帯共通の通知時刻を取る（GET /api/notification-settings）。
export function getNotificationTime(): Promise<NotificationTime> {
  return clientApiFetch<NotificationTime>("/api/notification-settings");
}

// 通知時刻を変える（PATCH /api/notification-settings）。世帯に所属する利用者は
// 全員、確認なしで変更できる（docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 5節）。
export function updateNotificationTime(input: NotificationTime): Promise<NotificationTime> {
  return clientApiFetch<NotificationTime>("/api/notification-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
