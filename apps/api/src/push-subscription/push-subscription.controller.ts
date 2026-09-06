import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { PushSubscriptionService } from "./push-subscription.service";
import { validatePushSubscriptionInput } from "./validation";

interface PushSubscriptionBody {
  [key: string]: unknown;
  endpoint?: unknown;
  keys?: unknown;
}

interface SubscribedResponse {
  subscribed: boolean;
}

// 端末の通知購読を読み書きする経路。世帯ではなく利用者本人にひも付く。
@Controller("push-subscriptions")
@UseGuards(SessionGuard)
export class PushSubscriptionController {
  constructor(private readonly pushSubscriptions: PushSubscriptionService) {}

  // 自分の端末が購読済みかを返す。
  @Get("me")
  async getMine(@Req() req: Request & { user: SessionUser }): Promise<SubscribedResponse> {
    const subscribed = await this.pushSubscriptions.isSubscribed(req.user.userId);
    return { subscribed };
  }

  // 購読を登録する。すでに購読があれば置き換える。
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Req() req: Request & { user: SessionUser },
    @Body() body: PushSubscriptionBody,
  ): Promise<SubscribedResponse> {
    const input = validatePushSubscriptionInput(body);
    await this.pushSubscriptions.subscribe(req.user.userId, input);
    return { subscribed: true };
  }

  // 購読を解除する。購読がなくても204を返す（べき等）。
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Req() req: Request & { user: SessionUser }): Promise<void> {
    await this.pushSubscriptions.unsubscribe(req.user.userId);
  }
}
