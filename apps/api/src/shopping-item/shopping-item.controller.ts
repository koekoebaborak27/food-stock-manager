import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { ShoppingItemService, type ShoppingItemListItem } from "./shopping-item.service";
import { validateAddShoppingItemInput } from "./validation";

interface AddShoppingItemBody {
  [key: string]: unknown;
  name?: unknown;
  sourceStockId?: unknown;
}

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

  // 商品を追加する。直接入力(name)・常備食から(sourceStockId)のどちらか一方を受け取る。
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Req() req: Request & { user: SessionUser },
    @Body() body: AddShoppingItemBody,
  ): Promise<ShoppingItemListItem> {
    const input = validateAddShoppingItemInput(body);
    return this.shoppingItems.addItem(req.user.userId, input);
  }
}
