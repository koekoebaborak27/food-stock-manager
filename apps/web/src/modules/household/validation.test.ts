import { describe, expect, it } from "vitest";
import { validateHouseholdName, validateInvitationCode } from "./validation";

/**
 * 対象: household/validation
 * 目的: 家族グループの名前・招待コードの入力チェックを担保する
 */
describe("household/validation validateHouseholdName", () => {
  describe("正常系", () => {
    it("1〜20文字の文字列であればnullを返す", () => {
      expect(validateHouseholdName("山田家")).toBeNull();
    });
  });

  describe("未入力のとき", () => {
    it("「入力してください」を返す", () => {
      expect(validateHouseholdName("")).toBe("入力してください");
    });

    it("空白だけのときも「入力してください」を返す", () => {
      expect(validateHouseholdName("   ")).toBe("入力してください");
    });
  });

  describe("21文字以上のとき", () => {
    it("「20文字以内で入力してください」を返す", () => {
      expect(validateHouseholdName("あ".repeat(21))).toBe("20文字以内で入力してください");
    });
  });

  describe("境界値: ちょうど20文字のとき", () => {
    it("nullを返す", () => {
      expect(validateHouseholdName("あ".repeat(20))).toBeNull();
    });
  });
});

describe("household/validation validateInvitationCode", () => {
  describe("正常系", () => {
    it("文字列であればnullを返す", () => {
      expect(validateInvitationCode("abc123")).toBeNull();
    });
  });

  describe("未入力のとき", () => {
    it("「入力してください」を返す", () => {
      expect(validateInvitationCode("")).toBe("入力してください");
    });

    it("空白だけのときも「入力してください」を返す", () => {
      expect(validateInvitationCode("   ")).toBe("入力してください");
    });
  });
});
