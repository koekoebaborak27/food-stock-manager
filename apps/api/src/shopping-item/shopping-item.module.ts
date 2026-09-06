import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ShoppingItemController } from "./shopping-item.controller";
import { ShoppingItemService } from "./shopping-item.service";

// 買い物リストの経路と業務処理をまとめる。
@Module({
  imports: [AuthModule],
  controllers: [ShoppingItemController],
  providers: [ShoppingItemService],
  exports: [ShoppingItemService],
})
export class ShoppingItemModule {}
