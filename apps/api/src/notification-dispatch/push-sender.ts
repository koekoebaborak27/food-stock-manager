// Web Pushで送る通知の内容（sw.jsが読む{ title, body, url }の形。02_API.md 4節）。
export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
}

export interface PushSubscriptionTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// 実際の送信手段（本番はweb-pushパッケージ）を差し替えられるようにするための境界。
// テストでは実際に送信しない偽の実装に差し替える。
export interface PushSender {
  // 1件送る。送信先の購読情報がもう無効だった場合はinvalid: trueを返す
  // （呼び出し側がPushSubscription行を削除する。01_Web_Push配信処理.md 4節）。
  send(
    subscription: PushSubscriptionTarget,
    payload: NotificationPayload,
  ): Promise<{ invalid: boolean }>;
}

export const PUSH_SENDER = Symbol("PUSH_SENDER");
