import { describe, expect, it } from "vitest";
import {
  INVITATION_TTL_MS,
  computeInvitationExpiry,
  generateInvitationCode,
  isInvitationExpired,
} from "./invitation-code";

/**
 * 対象: household/invitation-code
 * 目的: 招待コードの生成・有効期限の計算/判定が
 *       docs/specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md 6節のとおりに動くことを担保する
 */
describe("household/invitation-code generateInvitationCode", () => {
  it("呼ぶたびに異なるコードを返す", () => {
    const a = generateInvitationCode();
    const b = generateInvitationCode();
    expect(a).not.toBe(b);
  });

  it("URLに安全な文字だけで構成される", () => {
    const code = generateInvitationCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("household/invitation-code computeInvitationExpiry", () => {
  it("基準時刻からINVITATION_TTL_MS後の日時を返す", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeInvitationExpiry(now).getTime()).toBe(now.getTime() + INVITATION_TTL_MS);
  });
});

describe("household/invitation-code isInvitationExpired", () => {
  describe("有効期限が基準時刻より未来のとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const expiresAt = new Date("2026-01-08T00:00:00.000Z");
      expect(isInvitationExpired(expiresAt, now)).toBe(false);
    });
  });

  describe("有効期限が基準時刻より過去のとき", () => {
    it("true を返す", () => {
      const now = new Date("2026-01-08T00:00:00.000Z");
      const expiresAt = new Date("2026-01-01T00:00:00.000Z");
      expect(isInvitationExpired(expiresAt, now)).toBe(true);
    });
  });
});
