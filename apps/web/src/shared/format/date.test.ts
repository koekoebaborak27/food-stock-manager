import { describe, expect, it } from "vitest";
import { formatDateFromDateTime, formatDateOnly, formatDateTime } from "./date";

/**
 * 対象: shared/format/date
 * 目的: 日時をJSTの「YYYY年M月D日 H:MM」形式に変換できることを担保する
 * （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節）
 */
describe("shared/format/date formatDateTime", () => {
  it("UTCの日時をJSTへ変換し、月日と時に0を付けない", () => {
    expect(formatDateTime("2026-09-05T13:30:00.000Z")).toBe("2026年9月5日 22:30");
  });

  it("分は2桁でゼロ埋めする", () => {
    expect(formatDateTime("2026-01-01T00:05:00.000Z")).toBe("2026年1月1日 9:05");
  });

  it("JSTへの変換で日付が変わる場合も正しく繰り上がる", () => {
    expect(formatDateTime("2026-01-01T15:00:00.000Z")).toBe("2026年1月2日 0:00");
  });
});

/**
 * 対象: shared/format/date
 * 目的: 期限の日付だけの文字列をJSTの「YYYY年M月D日」形式に変換できることを担保する
 * （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節）
 */
describe("shared/format/date formatDateOnly", () => {
  it("月日に0を付けない", () => {
    expect(formatDateOnly("2026-09-05")).toBe("2026年9月5日");
  });
});

/**
 * 対象: shared/format/date
 * 目的: 時刻を持つ日時からJSTの日付部分だけを「YYYY年M月D日」形式に変換できることを担保する
 * （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節）
 */
describe("shared/format/date formatDateFromDateTime", () => {
  it("時刻を出さず、UTCの日時をJSTへ変換した日付を返す", () => {
    expect(formatDateFromDateTime("2026-09-05T13:30:00.000Z")).toBe("2026年9月5日");
  });

  it("JSTへの変換で日付が変わる場合も正しく繰り上がる", () => {
    expect(formatDateFromDateTime("2026-01-01T15:00:00.000Z")).toBe("2026年1月2日");
  });
});
