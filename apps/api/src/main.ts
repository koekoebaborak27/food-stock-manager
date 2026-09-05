import "reflect-metadata";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { RequestMethod } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AppErrorFilter } from "./common/filters/app-error.filter";

// API サーバーを起動する。
// 待ち受ける番号は、本番（Cloud Run）では実行環境から PORT として渡される。
// 渡されないローカル開発では 3001 番を使う（3000 番は画面側の Next.js が使うため）。
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new AppErrorFilter());
  // 経路の先頭を/apiに揃える（docs/specs/02_basic-design/00_共通/02_API共通.md）。
  // 動作確認用の健康確認（GET /）だけは対象外にする。
  app.setGlobalPrefix("api", { exclude: [{ path: "/", method: RequestMethod.GET }] });
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
