import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { validateStockInput, validateStockListQuery, validateUpdatedAt } from "./validation";

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
}
