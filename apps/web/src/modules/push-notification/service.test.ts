import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientApiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/api/client-fetch", () => ({ clientApiFetch: clientApiFetchMock }));

import { disableNotification, enableNotification } from "./service";

// テスト環境はjsdomを使わないnode環境のため（vitest.config.ts）、
// navigator・window・Notificationを最小限のオブジェクトで用意する
// （apps/web/src/modules/stock/save-toast.test.tsと同じ方式）。
function stubBrowser(options: {
  isIos?: boolean;
  permission?: NotificationPermission;
  existingSubscription?: unknown;
}) {
  const requestPermission = vi.fn().mockResolvedValue(options.permission ?? "granted");
  const subscribeMock = vi.fn().mockResolvedValue({
    toJSON: () => ({
      endpoint: "https://push.example.com/new",
      keys: { p256dh: "p256dh-1", auth: "auth-1" },
    }),
  });
  const getSubscriptionMock = vi.fn().mockResolvedValue(options.existingSubscription ?? null);
  const registration = {
    pushManager: { subscribe: subscribeMock, getSubscription: getSubscriptionMock },
  };
  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    getRegistration: vi.fn().mockResolvedValue(registration),
  };
  const navigatorStub = {
    serviceWorker,
    maxTouchPoints: 0,
    userAgent: options.isIos ? "iPhone" : "TestBrowser",
    standalone: undefined,
  };
  const windowStub = {
    navigator: navigatorStub,
    matchMedia: () => ({ matches: false }),
    atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    PushManager: function PushManager() {},
    Notification: { requestPermission },
  };

  vi.stubGlobal("navigator", navigatorStub);
  vi.stubGlobal("window", windowStub);
  vi.stubGlobal("Notification", { requestPermission });
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AAAA";

  return { requestPermission, subscribeMock, getSubscriptionMock, serviceWorker };
}

/**
 * 対象: push-notification/enableNotification・disableNotification
 * 目的: 通知を有効にする操作の流れ（対応確認→許可→購読登録）の分岐と、
 *       無効にする操作（ブラウザ側解除→サーバー側削除）を担保する
 *       （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 2・4節）。
 */
describe("push-notification/service", () => {
  beforeEach(() => {
    clientApiFetchMock.mockReset();
    clientApiFetchMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("enableNotification", () => {
    it("iOSでホーム画面に追加していない場合はIOS_NOT_INSTALLEDを返し、許可を求めない", async () => {
      const { requestPermission } = stubBrowser({ isIos: true });

      const result = await enableNotification();

      expect(result).toEqual({ ok: false, reason: "IOS_NOT_INSTALLED" });
      expect(requestPermission).not.toHaveBeenCalled();
      expect(clientApiFetchMock).not.toHaveBeenCalled();
    });

    it("端末が通知を許可しなかった場合はPERMISSION_DENIEDを返す", async () => {
      stubBrowser({ permission: "denied" });

      const result = await enableNotification();

      expect(result).toEqual({ ok: false, reason: "PERMISSION_DENIED" });
      expect(clientApiFetchMock).not.toHaveBeenCalled();
    });

    it("許可された場合は購読を登録し、POST /api/push-subscriptionsを呼ぶ", async () => {
      stubBrowser({ permission: "granted" });

      const result = await enableNotification();

      expect(result).toEqual({ ok: true });
      expect(clientApiFetchMock).toHaveBeenCalledWith(
        "/api/push-subscriptions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            endpoint: "https://push.example.com/new",
            keys: { p256dh: "p256dh-1", auth: "auth-1" },
          }),
        }),
      );
    });

    it("すでに購読済みの場合は新しく作らず、既存の購読をそのまま登録する", async () => {
      const existingSubscription = {
        toJSON: () => ({
          endpoint: "https://push.example.com/existing",
          keys: { p256dh: "p", auth: "a" },
        }),
      };
      const { subscribeMock } = stubBrowser({ permission: "granted", existingSubscription });

      await enableNotification();

      expect(subscribeMock).not.toHaveBeenCalled();
      expect(clientApiFetchMock).toHaveBeenCalledWith(
        "/api/push-subscriptions",
        expect.objectContaining({
          body: JSON.stringify({
            endpoint: "https://push.example.com/existing",
            keys: { p256dh: "p", auth: "a" },
          }),
        }),
      );
    });
  });

  describe("disableNotification", () => {
    it("ブラウザ側の購読を解除し、サーバー側もDELETEする", async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true);
      stubBrowser({ existingSubscription: { unsubscribe } });

      await disableNotification();

      expect(unsubscribe).toHaveBeenCalled();
      expect(clientApiFetchMock).toHaveBeenCalledWith("/api/push-subscriptions/me", {
        method: "DELETE",
      });
    });

    it("ブラウザ側に購読が無くても、サーバー側のDELETEは行う（べき等）", async () => {
      stubBrowser({ existingSubscription: null });

      await disableNotification();

      expect(clientApiFetchMock).toHaveBeenCalledWith("/api/push-subscriptions/me", {
        method: "DELETE",
      });
    });
  });
});
