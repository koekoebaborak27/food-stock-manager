import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import webpush, { WebPushError } from "web-push";
import type { PushSubscriptionTarget } from "./push-sender";
import { WebPushSender } from "./web-push-sender";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
  WebPushError: class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

/**
 * 対象: notification-dispatch/WebPushSender send
 * 目的: 送信に成功したらinvalid:falseを返し、
 *       購読先が存在しない(404/410)ときだけinvalid:trueを返し、
 *       それ以外の失敗ではinvalid:falseを返す(再送しない)ことを確かめる。
 */
describe("notification-dispatch/WebPushSender send", () => {
  const sender = new WebPushSender();
  const subscription: PushSubscriptionTarget = {
    id: "sub-1",
    endpoint: "https://push.example.com/a",
    p256dh: "p256dh",
    auth: "auth",
  };
  const payload = { title: "見出し", body: "本文", url: "/?urgentOnly=true" };

  beforeEach(() => {
    vi.mocked(webpush.sendNotification).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("送信に成功したとき", () => {
    it("invalid: falseを返す", async () => {
      vi.mocked(webpush.sendNotification).mockResolvedValueOnce({
        statusCode: 201,
        body: "",
        headers: {},
      });

      const result = await sender.send(subscription, payload);

      expect(result).toEqual({ invalid: false });
    });
  });

  describe("購読先が存在しない(404/410)とき", () => {
    it.each([404, 410])("statusCode=%iでinvalid: trueを返す", async (statusCode) => {
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
        new WebPushError("gone", statusCode, {}, "", subscription.endpoint),
      );

      const result = await sender.send(subscription, payload);

      expect(result).toEqual({ invalid: true });
    });
  });

  describe("その他の失敗のとき", () => {
    it("WebPushErrorだがstatusCodeが404/410以外ならinvalid: falseを返す", async () => {
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
        new WebPushError("server error", 500, {}, "", subscription.endpoint),
      );

      const result = await sender.send(subscription, payload);

      expect(result).toEqual({ invalid: false });
    });

    it("WebPushErrorでない失敗(通信エラー等)ならinvalid: falseを返す", async () => {
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error("network error"));

      const result = await sender.send(subscription, payload);

      expect(result).toEqual({ invalid: false });
    });
  });
});
