import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { StockService, type StockListItem } from "./stock.service";
import { validateStockListQuery } from "./validation";

// 常備食の読み取り経路。利用者の家族グループはセッションから決める。
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
}
