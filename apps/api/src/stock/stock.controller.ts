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
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { StockService, type StockDetail, type StockListItem } from "./stock.service";
import {
  validateConsumeInput,
  validateQuantityDelta,
  validateStockInput,
  validateStockListQuery,
  validateUpdatedAt,
} from "./validation";

interface StockBody {
  [key: string]: unknown;
  name?: unknown;
  storageType?: unknown;
  quantity?: unknown;
  unit?: unknown;
  expiresOn?: unknown;
  isHomemade?: unknown;
  memo?: unknown;
}

interface UpdateStockBody extends StockBody {
  updatedAt?: unknown;
}

interface DeleteStockBody {
  updatedAt?: unknown;
}

interface QuantityBody {
  [key: string]: unknown;
  delta?: unknown;
}

interface ConsumeBody {
  [key: string]: unknown;
  addToShoppingList?: unknown;
}

// 常備食の読み書きの経路。利用者の家族グループはセッションから決める。
@Controller("stocks")
@UseGuards(SessionGuard)
export class StockController {
  constructor(private readonly stocks: StockService) {}

  // 常備食リストに表示する、未削除かつ未消費の食品を返す。
  @Get()
  async list(
    @Req() req: Request & { user: SessionUser },
    @Query() query: Record<string, unknown>,
  ): Promise<{ items: StockListItem[] }> {
    return this.stocks.list(req.user.userId, validateStockListQuery(query));
  }

  // 編集画面が表示する常備食1件を返す。
  @Get(":id")
  async getOne(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
  ): Promise<StockDetail> {
    return this.stocks.get(req.user.userId, id);
  }

  // 常備食を登録する。
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: SessionUser },
    @Body() body: StockBody,
  ): Promise<StockDetail & { duplicateName: boolean }> {
    const input = validateStockInput(body);
    return this.stocks.create(req.user.userId, input);
  }

  // 常備食を編集する。画面が読んだupdatedAtを本文に含めさせ、競合を確かめる。
  @Put(":id")
  async update(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: UpdateStockBody,
  ): Promise<StockDetail> {
    const input = validateStockInput(body);
    const updatedAt = validateUpdatedAt(body.updatedAt);
    return this.stocks.update(req.user.userId, id, input, updatedAt);
  }

  // 残数を1増減する。更新の競合は確認しない。
  @Patch(":id/quantity")
  async adjustQuantity(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: QuantityBody,
  ): Promise<StockDetail> {
    const delta = validateQuantityDelta(body);
    return this.stocks.adjustQuantity(req.user.userId, id, delta);
  }

  // 常備食を消費済にする。addToShoppingListは入力チェックのためだけに読み、
  // 買い物リスト機能が未実装のため使わない。
  @Post(":id/consume")
  @HttpCode(HttpStatus.NO_CONTENT)
  async consume(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: ConsumeBody,
  ): Promise<void> {
    validateConsumeInput(body);
    return this.stocks.consume(req.user.userId, id);
  }

  // 常備食を削除する（取り消す）。画面が読んだupdatedAtを本文に含めさせ、競合を確かめる。
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
    @Body() body: DeleteStockBody,
  ): Promise<void> {
    const updatedAt = validateUpdatedAt(body.updatedAt);
    return this.stocks.remove(req.user.userId, id, updatedAt);
  }

  // 削除を元に戻す。5秒以内かどうかはフロントエンドが判断する。
  @Post(":id/restore")
  @HttpCode(HttpStatus.NO_CONTENT)
  async restore(
    @Req() req: Request & { user: SessionUser },
    @Param("id") id: string,
  ): Promise<void> {
    return this.stocks.restore(req.user.userId, id);
  }
}
