import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { InternalAuthGuard } from "./internal-auth.guard";
import { NotificationDispatchService, type DispatchResult } from "./notification-dispatch.service";

// 期限通知の配信バッチの経路。Cloud Schedulerが15分ごとに呼ぶ内部専用API
// （ログインしている利用者が呼ぶ経路ではない。40_期限通知/02_API.md 3節）。
@Controller("internal/notifications")
@UseGuards(InternalAuthGuard)
export class NotificationDispatchController {
  constructor(private readonly dispatchService: NotificationDispatchService) {}

  @Post("dispatch")
  @HttpCode(HttpStatus.OK)
  dispatch(): Promise<DispatchResult> {
    return this.dispatchService.dispatch();
  }
}
