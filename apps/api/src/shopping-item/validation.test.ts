import { describe, expect, it } from "vitest";
import { validateAddShoppingItemInput, validatePurchasedInput } from "./validation";

/**
 * 対象: shopping-item/validation validateAddShoppingItemInput
 * 目的: 直接入力(name)・常備食から(sourceStockId)のどちらか一方だけを受け付け、
 *       商品名の必須・文字数チェックが02_API.mdの`code`どおりに働くことを担保する。
 */
describe("shopping-item/validation validateAddShoppingItemInput", () => {
  describe("nameだけを指定したとき", () => {
    it("前後の空白を除いた商品名を返す", () => {
      expect(validateAddShoppingItemInput({ name: " 牛乳 " })).toEqual({ name: "牛乳" });
    });
  });

  describe("sourceStockIdだけを指定したとき", () => {
    it("そのまま返す", () => {
      expect(validateAddShoppingItemInput({ sourceStockId: "stock-1" })).toEqual({
        sourceStockId: "stock-1",
      });
    });
  });

  describe("nameが空、または空白だけのとき", () => {
    it("AppError(SHOPPING_ITEM_NAME_REQUIRED) を投げる", () => {
      expect(() => validateAddShoppingItemInput({ name: "" })).toThrow(
        "SHOPPING_ITEM_NAME_REQUIRED",
      );
      expect(() => validateAddShoppingItemInput({ name: "   " })).toThrow(
        "SHOPPING_ITEM_NAME_REQUIRED",
      );
    });
  });

  describe("nameが31文字以上のとき", () => {
    it("AppError(SHOPPING_ITEM_NAME_TOO_LONG) を投げる", () => {
      expect(() => validateAddShoppingItemInput({ name: "あ".repeat(31) })).toThrow(
        "SHOPPING_ITEM_NAME_TOO_LONG",
      );
    });
  });

  describe("nameとsourceStockIdの両方を指定したとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() =>
        validateAddShoppingItemInput({ name: "牛乳", sourceStockId: "stock-1" }),
      ).toThrow("VALIDATION_ERROR");
    });
  });

  describe("どちらも指定しなかったとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateAddShoppingItemInput({})).toThrow("VALIDATION_ERROR");
    });
  });
});

/**
 * 対象: shopping-item/validation validatePurchasedInput
 * 目的: isPurchased・returnToStock・storageTypeの組み合わせチェックが
 *       02_API.mdの`code`どおりに働くことを担保する。
 */
describe("shopping-item/validation validatePurchasedInput", () => {
  describe("isPurchasedがfalseのとき", () => {
    it("returnToStock・storageTypeが無ければ受け付ける", () => {
      expect(validatePurchasedInput({ isPurchased: false })).toEqual({ isPurchased: false });
    });

    it("returnToStockが送られていればAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() => validatePurchasedInput({ isPurchased: false, returnToStock: true })).toThrow(
        "INVALID_PURCHASE_UPDATE",
      );
    });

    it("storageTypeが送られていればAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() => validatePurchasedInput({ isPurchased: false, storageType: "FROZEN" })).toThrow(
        "INVALID_PURCHASE_UPDATE",
      );
    });
  });

  describe("isPurchasedがtrueのとき", () => {
    it("returnToStockがfalseならstorageType無しで受け付ける", () => {
      expect(validatePurchasedInput({ isPurchased: true, returnToStock: false })).toEqual({
        isPurchased: true,
        returnToStock: false,
      });
    });

    it("returnToStockがfalseでstorageTypeが送られていればAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() =>
        validatePurchasedInput({ isPurchased: true, returnToStock: false, storageType: "FROZEN" }),
      ).toThrow("INVALID_PURCHASE_UPDATE");
    });

    it("returnToStockがtrueで正しいstorageTypeなら受け付ける", () => {
      expect(
        validatePurchasedInput({ isPurchased: true, returnToStock: true, storageType: "FROZEN" }),
      ).toEqual({ isPurchased: true, returnToStock: true, storageType: "FROZEN" });
    });

    it("returnToStockがtrueでstorageTypeが無ければAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() => validatePurchasedInput({ isPurchased: true, returnToStock: true })).toThrow(
        "INVALID_PURCHASE_UPDATE",
      );
    });

    it("returnToStockがtrueで不正なstorageTypeならAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() =>
        validatePurchasedInput({ isPurchased: true, returnToStock: true, storageType: "OTHER" }),
      ).toThrow("INVALID_PURCHASE_UPDATE");
    });

    it("returnToStockが真偽値でなければAppError(INVALID_PURCHASE_UPDATE)を投げる", () => {
      expect(() => validatePurchasedInput({ isPurchased: true })).toThrow(
        "INVALID_PURCHASE_UPDATE",
      );
    });
  });

  describe("isPurchasedが真偽値でないとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validatePurchasedInput({})).toThrow("VALIDATION_ERROR");
      expect(() => validatePurchasedInput({ isPurchased: "true" })).toThrow("VALIDATION_ERROR");
    });
  });
});
