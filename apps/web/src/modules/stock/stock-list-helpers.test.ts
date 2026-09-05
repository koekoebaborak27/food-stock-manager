import { describe, expect, it } from "vitest";
import { buildStockListQuery, formatQuantity, getExpiryLabel } from "./stock-list-helpers";

/**
 * 対象: stock/stock-list-helpers
 * 目的: 常備食一覧のAPI条件と、日本時間を基準にした期限・残数の表示を担保する。
 */
describe("stock/stock-list-helpers", () => {
  const now = new Date("2026-09-05T15:00:00.000Z");

  describe("getExpiryLabel", () => {
    it("日本時間で今日より前の期限を期限切れとして返す", () => {
      expect(getExpiryLabel("2026-09-05", now)).toEqual({
        status: "EXPIRED",
        label: "期限切れ（1日前）",
      });
    });

    it("日本時間で今日・明日・3日後の期限に決めた文言を返す", () => {
      expect(getExpiryLabel("2026-09-06", now)).toEqual({ status: "TODAY", label: "今日まで" });
      expect(getExpiryLabel("2026-09-07", now)).toEqual({ status: "TOMORROW", label: "明日まで" });
      expect(getExpiryLabel("2026-09-09", now)).toEqual({ status: "SOON", label: "あと3日" });
    });
  });

  describe("buildStockListQuery", () => {
    it("選択中の保存区分・検索・並び順・期限条件をAPI向けに返す", () => {
      expect(
        buildStockListQuery({
          storageType: "FROZEN",
          keyword: " カレー ",
          sort: "NAME",
          urgentOnly: true,
        }),
      ).toBe("sort=NAME&storageType=FROZEN&keyword=%E3%82%AB%E3%83%AC%E3%83%BC&urgentOnly=true");
    });
  });

  describe("formatQuantity", () => {
    it("単位があればつなげ、なければ数字だけを返す", () => {
      expect(formatQuantity(3, "PIECE")).toBe("3個");
      expect(formatQuantity(3, null)).toBe("3");
    });
  });
});
