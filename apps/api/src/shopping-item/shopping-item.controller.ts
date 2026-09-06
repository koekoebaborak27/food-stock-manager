import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import {
  ShoppingItemService,
  type ShoppingItemDeleteResult,
  type ShoppingItemListItem,
} from "./shopping-item.service";
import {
  validateAddShoppingItemInput,
  validateBulkItemsInput,
  validatePurchasedInput,
  validateUpdatedAt,
} from "./validation";

interface AddShoppingItemBody {
  [key: string]: unknown;
  name?: unknown;
  sourceStockId?: unknown;
}

interface PurchasedBody {
  [key: string]: unknown;
  isPurchased?: unknown;
  returnToStock?: unknown;
  storageType?: unknown;
  updatedAt?: unknown;
}

interface DeleteShoppingItemBody {
  [key: string]: unknown;
  updatedAt?: unknown;
}

interface BulkItemsBody {
  [key: string]: unknown;
  items?: unknown;
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

  // 購入状態を変える。未購入から購入済みへ変えるときだけ、常備食へ戻すかと保存区分を受け取る
  // （02_API.md 1節）。
  @Patch(":id/purchased")
  async setPurchased(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: PurchasedBody,
  ): Promise<ShoppingItemListItem> {
    const input = validatePurchasedInput(body);
    const updatedAt = validateUpdatedAt(body.updatedAt);
    return this.shoppingItems.setPurchased(req.user.userId, id, input, updatedAt);
  }

  // 購入済みを一括削除する。"purchased"は固定の1区画のため、":id"に奪われないよう
  // 先に定義する（stock.controller.tsの"consumed"と同じ理由）。
  @Delete("purchased")
  async removePurchased(
    @Req() req: Request & { user: SessionUser },
    @Body() body: BulkItemsBody,
  ): Promise<ShoppingItemDeleteResult> {
    const items = validateBulkItemsInput(body);
    return this.shoppingItems.removePurchased(req.user.userId, items);
  }

  // 商品を1件削除する。画面が読んだupdatedAtを本文に含めさせ、競合を確かめる。
  @Delete(":id")
  async remove(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: DeleteShoppingItemBody,
  ): Promise<ShoppingItemDeleteResult> {
    const updatedAt = validateUpdatedAt(body.updatedAt);
    return this.shoppingItems.remove(req.user.userId, id, updatedAt);
  }

  // 削除(1件・一括)を元に戻す。
  @Post("restore")
  async restore(
    @Req() req: Request & { user: SessionUser },
    @Body() body: BulkItemsBody,
  ): Promise<ShoppingItemDeleteResult> {
    const items = validateBulkItemsInput(body);
    return this.shoppingItems.restore(req.user.userId, items);
  }
}
