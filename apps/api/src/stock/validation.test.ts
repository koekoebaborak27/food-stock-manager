import { describe, expect, it } from "vitest";
import { validateStockListQuery } from "./validation";

/**
 * 対象: stock/validation validateStockListQuery
 * 目的: 常備食一覧の問い合わせ文字列を既定値へ変換し、受け付けない値を弾く。
 */
describe("stock/validation validateStockListQuery", () => {
  describe("条件を指定しないとき", () => {
    it("一覧に必要な既定値を返す", () => {
      expect(validateStockListQuery({})).toEqual({
        storageType: null,
        keyword: null,
        sort: "EXPIRY",
        urgentOnly: false,
      });
    });
  });

  describe("有効な条件を指定したとき", () => {
    it("保存区分、食品名、並び順、期限の絞り込みを返す", () => {
      expect(
        validateStockListQuery({
          storageType: "FROZEN",
          keyword: "カレー",
          sort: "NAME",
          urgentOnly: "true",
        }),
      ).toEqual({ storageType: "FROZEN", keyword: "カレー", sort: "NAME", urgentOnly: true });
    });
  });

  describe("保存区分に受け付けない値を指定したとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockListQuery({ storageType: "COLD" })).toThrow("VALIDATION_ERROR");
    });
  });

  describe("期限の絞り込みに真偽値以外を指定したとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockListQuery({ urgentOnly: "yes" })).toThrow("VALIDATION_ERROR");
    });
  });
});
