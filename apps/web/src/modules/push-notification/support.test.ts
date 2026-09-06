import { describe, expect, it } from "vitest";
import { checkNotificationPrerequisite } from "./support";

/**
 * 対象: push-notification/checkNotificationPrerequisite
 * 目的: 通知を有効にする操作の1〜2番目の確認（対応状況・iOSのホーム画面追加）を
 *       純粋な入力→出力として網羅する
 *       （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 2節）。
 */
describe("push-notification/checkNotificationPrerequisite", () => {
  const supported = {
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    isIosDevice: false,
    isStandaloneDisplay: false,
  };

  it("すべて対応していれば理由なし(null)を返す", () => {
    expect(checkNotificationPrerequisite(supported)).toBeNull();
  });

  it("Service Workerに対応していなければUNSUPPORTEDを返す", () => {
    expect(checkNotificationPrerequisite({ ...supported, hasServiceWorker: false })).toBe(
      "UNSUPPORTED",
    );
  });

  it("PushManagerに対応していなければUNSUPPORTEDを返す", () => {
    expect(checkNotificationPrerequisite({ ...supported, hasPushManager: false })).toBe(
      "UNSUPPORTED",
    );
  });

  it("Notificationに対応していなければUNSUPPORTEDを返す", () => {
    expect(checkNotificationPrerequisite({ ...supported, hasNotification: false })).toBe(
      "UNSUPPORTED",
    );
  });

  it("iOSでホーム画面に追加していなければIOS_NOT_INSTALLEDを返す", () => {
    expect(
      checkNotificationPrerequisite({
        ...supported,
        isIosDevice: true,
        isStandaloneDisplay: false,
      }),
    ).toBe("IOS_NOT_INSTALLED");
  });

  it("iOSでもホーム画面に追加していれば理由なし(null)を返す", () => {
    expect(
      checkNotificationPrerequisite({ ...supported, isIosDevice: true, isStandaloneDisplay: true }),
    ).toBeNull();
  });

  it("対応していない端末はiOSの判定より先に引っかかる", () => {
    expect(
      checkNotificationPrerequisite({
        ...supported,
        hasNotification: false,
        isIosDevice: true,
        isStandaloneDisplay: false,
      }),
    ).toBe("UNSUPPORTED");
  });
});
