import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { NotificationSettingService, type NotificationTime } from "./notification-setting.service";
import { validateNotificationTimeInput } from "./validation";

interface NotificationTimeBody {
  [key: string]: unknown;
  hour?: unknown;
  minute?: unknown;
}

// 世帯単位の通知時刻の読み書きの経路。利用者の家族グループはセッションから決める。
@Controller("notification-settings")
@UseGuards(SessionGuard)
export class NotificationSettingController {
  constructor(private readonly notificationSettings: NotificationSettingService) {}

  // 通知時刻を返す。行がなければ既定値（8:00）を返す。
  @Get()
  async get(@Req() req: Request & { user: SessionUser }): Promise<NotificationTime> {
    return this.notificationSettings.get(req.user.userId);
  }

  // 通知時刻を変える。世帯に所属する利用者は全員、確認なしで変更できる。
  @Patch()
  async update(
    @Req() req: Request & { user: SessionUser },
    @Body() body: NotificationTimeBody,
  ): Promise<NotificationTime> {
    const input = validateNotificationTimeInput(body);
    return this.notificationSettings.update(req.user.userId, input);
  }
}
