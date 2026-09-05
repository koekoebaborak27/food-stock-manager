// Server Actionの結果。画面が成功の帯と失敗の帯を出し分けるために使う。
export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

// アカウント設定画面に表示する利用者情報。
export interface AccountSettings {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}
