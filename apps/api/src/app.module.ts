import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";

// アプリ全体の入れ物。機能を足すときは、ここに機能ごとの入れ物を登録していく。
@Module({
  controllers: [AppController],
})
export class AppModule {}
