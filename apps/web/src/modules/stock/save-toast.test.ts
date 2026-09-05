import { beforeEach, describe, expect, it } from "vitest";
import { consumePendingSaveToast, setPendingSaveToast } from "./save-toast";

// テスト環境はjsdomを使わないnode環境のため（vitest.config.ts）、sessionStorageを
// 単純なメモリ実装で用意する。ブラウザではwindow.sessionStorageがこの役目を果たす。
function createMemorySessionStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

/**
 * 対象: stock/save-toast
 * 目的: 登録・編集画面の保存結果を、画面が移った先（常備食リスト画面）で
 *       一度だけ帯として出すためのsessionStorage受け渡しを担保する。
 */
describe("stock/save-toast", () => {
  beforeEach(() => {
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage =
      createMemorySessionStorage();
  });

  describe("保存直後に文言を置いたとき", () => {
    it("読み出すと同じ文言を返し、2回目はnullを返す", () => {
      setPendingSaveToast("保存しました");

      expect(consumePendingSaveToast()).toBe("保存しました");
      expect(consumePendingSaveToast()).toBeNull();
    });
  });

  describe("文言が置かれていないとき", () => {
    it("nullを返す", () => {
      expect(consumePendingSaveToast()).toBeNull();
    });
  });
});
