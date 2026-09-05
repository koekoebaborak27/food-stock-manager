import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// API サーバーを起動する。
// 待ち受ける番号は、本番（Cloud Run）では実行環境から PORT として渡される。
// 渡されないローカル開発では 3001 番を使う（3000 番は画面側の Next.js が使うため）。
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
