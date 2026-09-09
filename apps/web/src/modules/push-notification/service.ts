"use client";

import { clientApiFetch } from "@/shared/api/client-fetch";
import { checkNotificationPrerequisite, readBrowserSupport } from "./support";
import type { NotificationGuidanceReason } from "./types";

const SERVICE_WORKER_URL = "/sw.js";

export type EnableNotificationResult =
  { ok: true } | { ok: false; reason: NotificationGuidanceReason };

// 自分の端末が購読済みかを取る（GET /api/push-subscriptions/me）。
export function getSubscriptionStatus(): Promise<{ subscribed: boolean }> {
  return clientApiFetch<{ subscribed: boolean }>("/api/push-subscriptions/me");
}

// 通知を有効にする操作の一連の流れ
// （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 2節）。
// 途中で止まった場合は、呼び出し側でトグルをオフへ戻し、reasonに応じた案内を出す。
export async function enableNotification(): Promise<EnableNotificationResult> {
  // 端末の許可を求める前に、対応ブラウザか・iOSならホーム画面に追加済みかを確かめる。
  const prerequisiteReason = checkNotificationPrerequisite(readBrowserSupport());
  if (prerequisiteReason) {
    return { ok: false, reason: prerequisiteReason };
  }

  // ブラウザの通知許可ダイアログを出す。拒否されたらここで打ち切る。
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "PERMISSION_DENIED" };
  }

  // Service Workerを登録し、すでに購読済みならそれを使い、無ければ新規に購読する。
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(getVapidPublicKey()),
    }));

  // ブラウザが払い出した購読情報（送信先・鍵）をサーバー側にも登録する。
  const json = subscription.toJSON();
  await clientApiFetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });
  return { ok: true };
}

// 通知を無効にする操作（00_期限通知共通.md 4節）。ブラウザ側の購読を解除したうえで、
// サーバー側の登録も消す。ブラウザ側の購読がすでに無い場合もサーバー側の削除は行う
// （べき等なDELETEのため）。
export async function disableNotification(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }
  await clientApiFetch("/api/push-subscriptions/me", { method: "DELETE" });
}

function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY が設定されていません");
  }
  return key;
}

// pushManager.subscribeが要求するapplicationServerKeyの形式（Uint8Array）に、
// VAPIDの公開鍵（base64url文字列）を変換する。
function toApplicationServerKey(base64UrlKey: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64UrlKey.length % 4)) % 4);
  const base64 = (base64UrlKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}
