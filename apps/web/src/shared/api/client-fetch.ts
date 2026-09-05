"use client";

import { ApiError, type ApiErrorBody } from "./api-error";

const HTTP_STATUS_NO_CONTENT = 204;

// クライアントコンポーネントからバックエンドAPIを呼ぶ。
// next.config.tsのrewritesで同一オリジンに見えるため、相対パスで呼べば
// セッションCookieがブラウザによって自動で送られる。
export async function clientApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, init);

  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return undefined as T;
  }

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const errorBody = (body as { error?: ApiErrorBody }).error;
    throw new ApiError(response.status, errorBody?.code ?? "SERVER_ERROR", errorBody?.details);
  }
  return body as T;
}
