import path from "node:path";
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// .env が無い環境（CI・本番）では、環境変数は実行環境から直接渡される。
// ローカルだけ .env を読み込む。この読み込みが無いと、Prisma CLIは
// 「Prisma config detected, skipping environment variable loading.」の挙動により
// DATABASE_URL 等を一切読まなくなり、コマンドが軒並み失敗する。
if (existsSync(".env")) {
  process.loadEnvFile();
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
