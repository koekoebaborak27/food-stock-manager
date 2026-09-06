import { Errors } from "../common/errors/app-error";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// 文字列としての中身があるかだけを確かめる。空文字・型違反はどちらも失敗にする。
function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

// 購読登録の入力を確かめる。ブラウザのPushSubscriptionをそのまま渡す想定
// （endpoint・keys.p256dh・keys.auth）。引っかかった項目をすべて集め、
// 1件でもあればまとめてVALIDATION_ERRORにする（02_API共通.md 6節）。
export function validatePushSubscriptionInput(
  body: Record<string, unknown>,
): PushSubscriptionInput {
  const failedFields: string[] = [];

  const endpoint = body.endpoint;
  if (!hasText(endpoint)) {
    failedFields.push("endpoint");
  }

  const keys =
    typeof body.keys === "object" && body.keys !== null
      ? (body.keys as Record<string, unknown>)
      : {};
  const p256dh = keys.p256dh;
  if (!hasText(p256dh)) {
    failedFields.push("keys.p256dh");
  }
  const auth = keys.auth;
  if (!hasText(auth)) {
    failedFields.push("keys.auth");
  }

  if (failedFields.length > 0) {
    throw Errors.validation({ fields: failedFields });
  }

  return {
    endpoint: endpoint as string,
    p256dh: p256dh as string,
    auth: auth as string,
  };
}
