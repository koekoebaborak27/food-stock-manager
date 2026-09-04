import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    // テストは実装ファイルの隣に置く（コロケーション）。方針は TESTING.md。
    // tools/ はアプリ本体ではなく、リポジトリの決まりごとを検査するテストを置く場所。
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tools/**/*.{test,spec}.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
