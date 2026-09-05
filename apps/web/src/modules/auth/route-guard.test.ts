import { describe, expect, it } from "vitest";
import { decideRedirect } from "./route-guard";

/**
 * 対象: auth/route-guard decideRedirect
 * 目的: ログインの有無と現在地から、画面を振り分ける遷移先の決め方を担保する
 */
describe("auth/route-guard decideRedirect", () => {
  describe("ログイン画面にいるとき", () => {
    it("ログイン済みなら / へ遷移させる", () => {
      expect(decideRedirect(true, "/login")).toBe("/");
    });

    it("未ログインならそのまま留まる", () => {
      expect(decideRedirect(false, "/login")).toBeNull();
    });
  });

  describe("ログイン画面以外にいるとき", () => {
    it("ログイン済みならそのまま留まる", () => {
      expect(decideRedirect(true, "/")).toBeNull();
    });

    it("未ログインなら /login へ遷移させる", () => {
      expect(decideRedirect(false, "/")).toBe("/login");
    });
  });
});
