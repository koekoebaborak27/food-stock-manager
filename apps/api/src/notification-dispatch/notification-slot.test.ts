import { describe, expect, it } from "vitest";
import { toNotificationSlot } from "./notification-slot";

/**
 * 対象: notification-dispatch/notification-slot toNotificationSlot
 * 目的: 現在時刻を日本時間の15分単位の枠(0/15/30/45分)へ丸め、
 *       lastNotifiedOnと比較できる日本時間の暦日を返すことを確かめる。
 */
describe("notification-dispatch/notification-slot toNotificationSlot", () => {
  it.each([
    ["2026-09-06T00:00:00.000Z", 9, 0], // UTC0時 = 日本時間9時ちょうど
    ["2026-09-06T00:07:00.000Z", 9, 0], // 9時07分 → 9時00分に切り捨て
    ["2026-09-06T00:14:59.999Z", 9, 0], // 9時14分59秒999 → 9時00分
    ["2026-09-06T00:15:00.000Z", 9, 15], // 9時15分ちょうど
    ["2026-09-06T00:44:00.000Z", 9, 30], // 9時44分 → 9時30分
    ["2026-09-05T23:59:59.999Z", 8, 45], // 日本時間8時59分59秒999 → 8時45分
  ])("%s は 日本時間%d時%d分の枠に丸める", (isoString, hour, minute) => {
    const slot = toNotificationSlot(new Date(isoString));
    expect(slot.hour).toBe(hour);
    expect(slot.minute).toBe(minute);
  });

  it("日本時間で日付が変わる時刻(UTC15時)は翌日の暦日を返す", () => {
    // UTC 2026-09-05T15:00:00 = 日本時間 2026-09-06T00:00:00
    const slot = toNotificationSlot(new Date("2026-09-05T15:00:00.000Z"));
    expect(slot.date).toEqual(new Date("2026-09-06T00:00:00.000Z"));
    expect(slot.hour).toBe(0);
    expect(slot.minute).toBe(0);
  });

  it("日本時間で日付が変わる直前(UTC14時59分59秒999)は当日の暦日を返す", () => {
    const slot = toNotificationSlot(new Date("2026-09-05T14:59:59.999Z"));
    expect(slot.date).toEqual(new Date("2026-09-05T00:00:00.000Z"));
    expect(slot.hour).toBe(23);
    expect(slot.minute).toBe(45);
  });
});
