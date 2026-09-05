import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";

// 常備食の経路と業務処理をまとめる。
@Module({
  imports: [AuthModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
