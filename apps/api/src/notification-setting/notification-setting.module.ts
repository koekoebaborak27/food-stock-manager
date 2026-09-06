import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationSettingController } from "./notification-setting.controller";
import { NotificationSettingService } from "./notification-setting.service";

// 通知時刻の経路と業務処理をまとめる。
@Module({
  imports: [AuthModule],
  controllers: [NotificationSettingController],
  providers: [NotificationSettingService],
  exports: [NotificationSettingService],
})
export class NotificationSettingModule {}
