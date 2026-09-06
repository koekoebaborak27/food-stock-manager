import { describe, expect, it } from "vitest";
import { AppError } from "../common/errors/app-error";
import { validateNotificationTimeInput } from "./validation";

/**
 * 対象: notification-setting/validation validateNotificationTimeInput
 * 目的: 選べる分(0/15/30/45)以外・範囲外の時をNOTIFICATION_TIME_INVALIDで弾き、
 *       正しい入力はそのまま返すことを確かめる。
 */
describe("notification-setting/validation validateNotificationTimeInput", () => {
  describe("正しい入力のとき", () => {
    it.each([0, 15, 30, 45])("hour=8, minute=%iをそのまま返す", (minute) => {
      expect(validateNotificationTimeInput({ hour: 8, minute })).toEqual({ hour: 8, minute });
    });

    it("hourが0・23の境界でも通す", () => {
      expect(validateNotificationTimeInput({ hour: 0, minute: 0 })).toEqual({ hour: 0, minute: 0 });
      expect(validateNotificationTimeInput({ hour: 23, minute: 0 })).toEqual({
        hour: 23,
        minute: 0,
      });
    });
  });

  describe("崩れた入力のとき", () => {
    it("minuteが0/15/30/45以外ならNOTIFICATION_TIME_INVALIDを投げる", () => {
      expect(() => validateNotificationTimeInput({ hour: 8, minute: 10 })).toThrow(AppError);
      try {
        validateNotificationTimeInput({ hour: 8, minute: 10 });
      } catch (error) {
        expect((error as AppError).code).toBe("NOTIFICATION_TIME_INVALID");
      }
    });

    it("hourが範囲外(-1・24)ならNOTIFICATION_TIME_INVALIDを投げる", () => {
      expect(() => validateNotificationTimeInput({ hour: -1, minute: 0 })).toThrow(AppError);
      expect(() => validateNotificationTimeInput({ hour: 24, minute: 0 })).toThrow(AppError);
    });

    it("hour・minuteが数値でないならNOTIFICATION_TIME_INVALIDを投げる", () => {
      expect(() => validateNotificationTimeInput({ hour: "8", minute: 0 })).toThrow(AppError);
      expect(() => validateNotificationTimeInput({ hour: 8, minute: "0" })).toThrow(AppError);
    });

    it("hourが整数でないならNOTIFICATION_TIME_INVALIDを投げる", () => {
      expect(() => validateNotificationTimeInput({ hour: 8.5, minute: 0 })).toThrow(AppError);
    });
  });
});
