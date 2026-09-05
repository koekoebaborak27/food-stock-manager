import { describe, expect, it } from "vitest";
import { validateStockInput, validateStockListQuery, validateUpdatedAt } from "./validation";

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

/**
 * 対象: stock/validation validateStockInput
 * 目的: 常備食の登録・編集の入力チェック（必須・文字数・範囲）と、
 *       複数項目が同時に引っかかったときにすべてdetailsへ集めることを担保する。
 */
describe("stock/validation validateStockInput", () => {
  const validBody = {
    name: "にんじん",
    storageType: "REFRIGERATED",
    quantity: 2,
    unit: "PIECE",
    expiresOn: "2026-09-10",
    isHomemade: true,
    memo: "メモ",
  };

  describe("すべて有効な値を指定したとき", () => {
    it("前後の空白を取り除いた入力値を返す", () => {
      expect(validateStockInput({ ...validBody, name: "  にんじん  " })).toEqual(validBody);
    });
  });

  describe("任意項目を省略したとき", () => {
    it("単位はnull、期限はnull、作り置きはfalse、メモはnullを既定値にする", () => {
      expect(
        validateStockInput({ name: "にんじん", storageType: "REFRIGERATED", quantity: 1 }),
      ).toEqual({
        name: "にんじん",
        storageType: "REFRIGERATED",
        quantity: 1,
        unit: null,
        expiresOn: null,
        isHomemade: false,
        memo: null,
      });
    });
  });

  describe("食品名が未入力のとき", () => {
    it("AppError(VALIDATION_ERROR) をfields:['name']で投げる", () => {
      expect(() => validateStockInput({ ...validBody, name: "  " })).toThrow("VALIDATION_ERROR");
      try {
        validateStockInput({ ...validBody, name: "  " });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({ details: { fields: ["name"] } });
      }
    });
  });

  describe("食品名が31文字以上のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, name: "あ".repeat(31) })).toThrow(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("保存区分が未指定のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, storageType: undefined })).toThrow(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("残数が数字でないとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, quantity: "2" })).toThrow("VALIDATION_ERROR");
    });
  });

  describe("残数が範囲外のとき", () => {
    it("100以上ならAppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, quantity: 100 })).toThrow("VALIDATION_ERROR");
    });

    it("0未満ならAppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, quantity: -1 })).toThrow("VALIDATION_ERROR");
    });
  });

  describe("メモが201文字以上のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateStockInput({ ...validBody, memo: "あ".repeat(201) })).toThrow(
        "VALIDATION_ERROR",
      );
    });
  });

  describe("食品名と残数の両方が引っかかったとき", () => {
    it("fields:['name','quantity']をまとめてAppError(VALIDATION_ERROR) で投げる", () => {
      try {
        validateStockInput({ ...validBody, name: "", quantity: 100 });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({ details: { fields: ["name", "quantity"] } });
      }
    });
  });
});

/**
 * 対象: stock/validation validateUpdatedAt
 * 目的: 編集時に画面が読んだupdatedAtをDateへ変換し、解釈できない値を弾く。
 */
describe("stock/validation validateUpdatedAt", () => {
  describe("ISO日時文字列を指定したとき", () => {
    it("Dateへ変換して返す", () => {
      expect(validateUpdatedAt("2026-09-05T08:30:00.000Z")).toEqual(
        new Date("2026-09-05T08:30:00.000Z"),
      );
    });
  });

  describe("日時として解釈できない値のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateUpdatedAt("not-a-date")).toThrow("VALIDATION_ERROR");
    });
  });

  describe("未指定のとき", () => {
    it("AppError(VALIDATION_ERROR) を投げる", () => {
      expect(() => validateUpdatedAt(undefined)).toThrow("VALIDATION_ERROR");
    });
  });
});
