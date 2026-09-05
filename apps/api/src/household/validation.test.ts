import { describe, expect, it } from "vitest";
import { validateHouseholdName, validateInvitationCode } from "./validation";

/**
 * 対象: household/validation
 * 目的: 家族グループの名前・招待コードの入力チェックを担保する
 */
describe("household/validation validateHouseholdName", () => {
  describe("正常系", () => {
    it("1〜20文字の文字列をそのまま返す", () => {
      expect(validateHouseholdName("山田家")).toBe("山田家");
    });

    it("前後の空白を取り除く", () => {
      expect(validateHouseholdName("  鈴木家  ")).toBe("鈴木家");
    });
  });

  describe("未入力のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateHouseholdName("")).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });

    it("空白だけのときもAppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateHouseholdName("   ")).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });

    it("文字列以外が渡されたときもAppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateHouseholdName(undefined)).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });
  });

  describe("21文字以上のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateHouseholdName("あ".repeat(21))).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });
  });

  describe("境界値: ちょうど20文字のとき", () => {
    it("そのまま返す", () => {
      const name = "あ".repeat(20);
      expect(validateHouseholdName(name)).toBe(name);
    });
  });
});

describe("household/validation validateInvitationCode", () => {
  describe("正常系", () => {
    it("文字列をそのまま返す", () => {
      expect(validateInvitationCode("abc123")).toBe("abc123");
    });
  });

  describe("未入力のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateInvitationCode("")).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });

    it("文字列以外が渡されたときもAppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateInvitationCode(undefined)).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR" }),
      );
    });
  });
});
