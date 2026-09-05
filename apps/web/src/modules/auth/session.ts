import "server-only";
import { serverApiFetch } from "@/shared/api/server-fetch";
import type { SessionInfo } from "./types";

// ログイン状態を取得する。未ログインならAppError(UNAUTHENTICATED)を投げる
// （proxy.tsでCookieの有無をすでに確認した画面からのみ呼ぶ想定）。
export function getSession(): Promise<SessionInfo> {
  return serverApiFetch<SessionInfo>("/api/auth/session");
}
