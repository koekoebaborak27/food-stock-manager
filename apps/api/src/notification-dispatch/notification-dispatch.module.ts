import { Module } from "@nestjs/common";
import { StockModule } from "../stock/stock.module";
import { NotificationDispatchController } from "./notification-dispatch.controller";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { PUSH_SENDER } from "./push-sender";
import { WebPushSender } from "./web-push-sender";

// 期限通知の配信バッチをまとめる。件数の数え方はStockServiceを再利用するため
// StockModuleを読み込む（01_Web_Push配信処理.md 3節）。
@Module({
  imports: [StockModule],
  controllers: [NotificationDispatchController],
  providers: [NotificationDispatchService, { provide: PUSH_SENDER, useClass: WebPushSender }],
})
export class NotificationDispatchModule {}
