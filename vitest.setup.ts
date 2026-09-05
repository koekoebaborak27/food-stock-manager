import { existsSync } from "node:fs";

// ローカル実行時だけ .env を読み込み、DATABASE_URL 等をprocess.envへ入れる
// （CIでは実行環境から直接渡されるため不要。prisma.config.ts と同じ考え方）。
// DB統合テスト（*.int.test.ts）がPrismaへ接続するために必要。
if (existsSync(".env")) {
  process.loadEnvFile();
}
