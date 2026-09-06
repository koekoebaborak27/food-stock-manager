import { describe, expect, it } from "vitest";
import { validateShoppingItemName } from "./validation";

/**
 * 対象: shopping-item/validation validateShoppingItemName
 * 目的: 買い物リストへ直接入力する商品名の入力チェックの文言を担保する
 *       （docs/specs/02_basic-design/30_買い物リスト/10_買い物リスト.md 3・7節）。
 */
describe("shopping-item/validation validateShoppingItemName", () => {
  it("未入力なら「入力してください」を返す", () => {
    expect(validateShoppingItemName("  ")).toBe("入力してください");
  });

  it("31文字以上なら「30文字以内で入力してください」を返す", () => {
    expect(validateShoppingItemName("あ".repeat(31))).toBe("30文字以内で入力してください");
  });

  it("30文字以内ならnullを返す", () => {
    expect(validateShoppingItemName("牛乳")).toBeNull();
  });
});
