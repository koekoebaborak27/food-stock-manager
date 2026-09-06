import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ShoppingItemModule } from "../shopping-item/shopping-item.module";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";

// 常備食の経路と業務処理をまとめる。消費済にする処理から買い物リストへの追加を呼ぶため
// ShoppingItemModuleを読み込む（00_買い物リスト共通.md 2節）。
@Module({
  imports: [AuthModule, ShoppingItemModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
