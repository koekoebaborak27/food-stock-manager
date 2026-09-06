import { describe, expect, it } from "vitest";
import { validatePushSubscriptionInput } from "./validation";

/**
 * 対象: push-subscription/validatePushSubscriptionInput
 * 目的: ブラウザのPushSubscriptionの形（endpoint・keys.p256dh・keys.auth）を
 *       確かめ、崩れている項目をすべて集めてVALIDATION_ERRORにすることを担保する。
 */
describe("push-subscription/validatePushSubscriptionInput", () => {
  const validBody = {
    endpoint: "https://push.example.com/abc",
    keys: { p256dh: "p256dh-value", auth: "auth-value" },
  };

  it("正しい形の入力はそのまま返す", () => {
    const result = validatePushSubscriptionInput(validBody);

    expect(result).toEqual({
      endpoint: "https://push.example.com/abc",
      p256dh: "p256dh-value",
      auth: "auth-value",
    });
  });

  it("endpointが無いとVALIDATION_ERRORを投げる", () => {
    const body = { keys: validBody.keys };

    expect(() => validatePushSubscriptionInput(body)).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR", details: { fields: ["endpoint"] } }),
    );
  });

  it("keysが無いとp256dh・authの両方が失敗として集まる", () => {
    const body = { endpoint: validBody.endpoint };

    expect(() => validatePushSubscriptionInput(body)).toThrowError(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { fields: ["keys.p256dh", "keys.auth"] },
      }),
    );
  });

  it("空文字は型が合っていても失敗として扱う", () => {
    const body = { endpoint: "", keys: { p256dh: "", auth: "auth-value" } };

    expect(() => validatePushSubscriptionInput(body)).toThrowError(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { fields: ["endpoint", "keys.p256dh"] },
      }),
    );
  });

  it("すべての項目が崩れている場合はまとめて集める", () => {
    const body = {};

    expect(() => validatePushSubscriptionInput(body)).toThrowError(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { fields: ["endpoint", "keys.p256dh", "keys.auth"] },
      }),
    );
  });
});
