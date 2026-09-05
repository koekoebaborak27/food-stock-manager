import { randomBytes } from "node:crypto";

export const INVITATION_CODE_BYTES = 18;
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 招待コードを作る。手入力ではなくコピー＆貼り付けを前提とするため、
// 読みやすさより総当たりされにくい長さを優先する
// （docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md 6節）。
export function generateInvitationCode(): string {
  return randomBytes(INVITATION_CODE_BYTES).toString("base64url");
}

// 発行・再発行のたびに入れ直す有効期限（発行時刻の7日後）を計算する。
export function computeInvitationExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_MS);
}

// 有効期限が過ぎているかを判定する。
export function isInvitationExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() < now.getTime();
}
