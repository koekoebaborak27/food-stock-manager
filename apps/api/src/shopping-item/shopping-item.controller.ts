import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { ShoppingItemService, type ShoppingItemListItem } from "./shopping-item.service";

// 買い物リストの読み書きの経路。利用者の家族グループはセッションから決める。
@Controller("shopping-items")
@UseGuards(SessionGuard)
export class ShoppingItemController {
  constructor(private readonly shoppingItems: ShoppingItemService) {}

  // 買い物リスト画面に表示する、未購入・購入済みを合わせた商品一覧を返す。
  @Get()
  async list(
    @Req() req: Request & { user: SessionUser },
  ): Promise<{ items: ShoppingItemListItem[] }> {
    return this.shoppingItems.list(req.user.userId);
  }
}
