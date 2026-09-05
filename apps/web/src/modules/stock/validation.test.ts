import { describe, expect, it } from "vitest";
import { validateMemo, validateQuantityInput, validateStockName } from "./validation";

/**
 * 対象: stock/validation
 * 目的: 登録・編集画面の入力欄が保存前に出す入力チェックの文言を担保する
 *       （docs/specs/02_basic-design/20_常備食管理/11_常備食の登録編集.md 2）。
 */
describe("stock/validation", () => {
  describe("validateStockName", () => {
    it("未入力なら「入力してください」を返す", () => {
      expect(validateStockName("  ")).toBe("入力してください");
    });

    it("31文字以上なら「30文字以内で入力してください」を返す", () => {
      expect(validateStockName("あ".repeat(31))).toBe("30文字以内で入力してください");
    });

    it("30文字以内ならnullを返す", () => {
      expect(validateStockName("にんじん")).toBeNull();
    });
  });

  describe("validateQuantityInput", () => {
    it("未入力なら「数字で入力してください」を返す", () => {
      expect(validateQuantityInput("")).toBe("数字で入力してください");
    });

    it("数字でなければ「数字で入力してください」を返す", () => {
      expect(validateQuantityInput("abc")).toBe("数字で入力してください");
    });

    it("0未満、または100以上なら「0以上99以下で入力してください」を返す", () => {
      expect(validateQuantityInput("-1")).toBe("0以上99以下で入力してください");
      expect(validateQuantityInput("100")).toBe("0以上99以下で入力してください");
    });

    it("0以上99以下ならnullを返す", () => {
      expect(validateQuantityInput("0")).toBeNull();
      expect(validateQuantityInput("99")).toBeNull();
    });
  });

  describe("validateMemo", () => {
    it("201文字以上なら「200文字以内で入力してください」を返す", () => {
      expect(validateMemo("あ".repeat(201))).toBe("200文字以内で入力してください");
    });

    it("未入力でも200文字以内ならnullを返す", () => {
      expect(validateMemo("")).toBeNull();
    });
  });
});
