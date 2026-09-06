import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PushSubscriptionController } from "./push-subscription.controller";
import { PushSubscriptionService } from "./push-subscription.service";

// 通知購読の経路と業務処理をまとめる。
@Module({
  imports: [AuthModule],
  controllers: [PushSubscriptionController],
  providers: [PushSubscriptionService],
  exports: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
