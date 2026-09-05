import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // テストは実装ファイルの隣に置く（コロケーション）。方針は TESTING.md。
    // apps/*/src が各アプリ（web / api）、tools/ はアプリ本体ではなく
    // リポジトリの決まりごとを検査するテストを置く場所。
    include: ["apps/*/src/**/*.{test,spec}.{ts,tsx}", "tools/**/*.{test,spec}.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // DB統合テスト（*.int.test.ts）は同じPostgresを共有し、各ファイルのbeforeEachで
    // テーブルごと初期化する（TESTING.md 7.2）。ファイルを並列実行すると、あるファイルの
    // 初期化が別ファイルの実行中データを消してしまうため、ファイル単位は直列に実行する。
    fileParallelism: false,
  },
});
