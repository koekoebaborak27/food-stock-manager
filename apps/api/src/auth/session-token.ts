import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Cookieに入れる生トークンを作る。DBにはこの値そのものを保存しない。
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// 生トークンをDBに保存する形（ハッシュ）へ変換する。
// 漏えい時にハッシュから生トークンを逆算できないようにするため。
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// 発行・延長のたびに入れ直す有効期限（今から30日後）を計算する。
export function computeSessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

// 有効期限が過ぎているかを判定する。
export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() < now.getTime();
}
