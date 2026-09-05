import "server-only";
import { serverApiFetch } from "@/shared/api/server-fetch";
import type { AccountSettings } from "./types";

// アカウント設定画面に表示する本人情報を取得する。
export function getAccountSettings(): Promise<AccountSettings> {
  return serverApiFetch<AccountSettings>("/api/auth/session");
}
