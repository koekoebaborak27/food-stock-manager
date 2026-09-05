import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  computeSessionExpiry,
  generateSessionToken,
  hashSessionToken,
  isSessionExpired,
} from "./session-token";

/**
 * 対象: auth/session-token
 * 目的: セッションCookieの生トークン生成・ハッシュ化・有効期限の計算/判定が
 *       docs/specs/03_detail-design/10_認証と家族グループ/01_セッション設計.md のとおりに動くことを担保する
 */
describe("auth/session-token generateSessionToken", () => {
  it("呼ぶたびに異なるトークンを返す", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
  });

  it("URLに安全な文字だけで構成される", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("auth/session-token hashSessionToken", () => {
  it("同じ生トークンからは同じハッシュを返す", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("生トークンが違えばハッシュも変わる", () => {
    expect(hashSessionToken("token-a")).not.toBe(hashSessionToken("token-b"));
  });

  it("生トークンそのものを含まない（ハッシュ化されている）", () => {
    const token = "raw-session-token";
    expect(hashSessionToken(token)).not.toContain(token);
  });
});

describe("auth/session-token computeSessionExpiry", () => {
  it("基準時刻からSESSION_TTL_MS後の日時を返す", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeSessionExpiry(now).getTime()).toBe(now.getTime() + SESSION_TTL_MS);
  });
});

describe("auth/session-token isSessionExpired", () => {
  describe("有効期限が基準時刻より未来のとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const expiresAt = new Date("2026-01-02T00:00:00.000Z");
      expect(isSessionExpired(expiresAt, now)).toBe(false);
    });
  });

  describe("有効期限が基準時刻より過去のとき", () => {
    it("true を返す", () => {
      const now = new Date("2026-01-02T00:00:00.000Z");
      const expiresAt = new Date("2026-01-01T00:00:00.000Z");
      expect(isSessionExpired(expiresAt, now)).toBe(true);
    });
  });
});
