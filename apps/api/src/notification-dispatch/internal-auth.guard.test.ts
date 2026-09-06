import type { ExecutionContext } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../common/errors/app-error";
import { InternalAuthGuard } from "./internal-auth.guard";

/**
 * 対象: notification-dispatch/InternalAuthGuard canActivate
 * 目的: X-Internal-Secretヘッダーが環境変数と一致するときだけ通し、
 *       一致しない・環境変数が無いときはINTERNAL_UNAUTHORIZEDを投げることを確かめる。
 */
describe("notification-dispatch/InternalAuthGuard canActivate", () => {
  const guard = new InternalAuthGuard();
  const originalSecret = process.env.INTERNAL_NOTIFICATION_SECRET;

  afterEach(() => {
    process.env.INTERNAL_NOTIFICATION_SECRET = originalSecret;
  });

  function contextWithHeader(headerValue: string | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => (name === "X-Internal-Secret" ? headerValue : undefined),
        }),
      }),
    } as unknown as ExecutionContext;
  }

  describe("環境変数と一致するとき", () => {
    it("通す", () => {
      process.env.INTERNAL_NOTIFICATION_SECRET = "shared-secret";
      expect(guard.canActivate(contextWithHeader("shared-secret"))).toBe(true);
    });
  });

  describe("環境変数と一致しないとき", () => {
    beforeEach(() => {
      process.env.INTERNAL_NOTIFICATION_SECRET = "shared-secret";
    });

    it("ヘッダーの値が違えばINTERNAL_UNAUTHORIZEDを投げる", () => {
      expect(() => guard.canActivate(contextWithHeader("wrong-secret"))).toThrow(AppError);
      try {
        guard.canActivate(contextWithHeader("wrong-secret"));
      } catch (error) {
        expect((error as AppError).code).toBe("INTERNAL_UNAUTHORIZED");
      }
    });

    it("ヘッダーが無ければINTERNAL_UNAUTHORIZEDを投げる", () => {
      expect(() => guard.canActivate(contextWithHeader(undefined))).toThrow(AppError);
    });
  });

  describe("環境変数が設定されていないとき", () => {
    it("ヘッダーがあってもINTERNAL_UNAUTHORIZEDを投げる", () => {
      delete process.env.INTERNAL_NOTIFICATION_SECRET;
      expect(() => guard.canActivate(contextWithHeader("anything"))).toThrow(AppError);
    });
  });
});
