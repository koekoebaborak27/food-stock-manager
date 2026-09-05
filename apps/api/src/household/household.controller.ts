import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { HouseholdService, type HouseholdDetail } from "./household.service";
import { validateHouseholdName } from "./validation";

interface CreateHouseholdBody {
  name?: unknown;
}

@Controller("households")
@UseGuards(SessionGuard)
export class HouseholdController {
  constructor(private readonly households: HouseholdService) {}

  // 家族グループをつくる。呼んだ利用者を管理者として登録する。
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: SessionUser },
    @Body() body: CreateHouseholdBody,
  ): Promise<{ id: string; name: string }> {
    const name = validateHouseholdName(body.name);
    return this.households.create(req.user.userId, name);
  }

  // 自分の家族グループとメンバー一覧を見る。
  @Get("me")
  async getMine(@Req() req: Request & { user: SessionUser }): Promise<HouseholdDetail> {
    return this.households.getMine(req.user.userId);
  }

  // 自分自身が家族グループを脱退する。
  @Delete("me/membership")
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Req() req: Request & { user: SessionUser }): Promise<void> {
    await this.households.leave(req.user.userId);
  }

  // メンバーを除名する（管理者だけ）。
  @Delete("me/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() req: Request & { user: SessionUser },
    @Param("userId") targetUserId: string,
  ): Promise<void> {
    await this.households.removeMember(req.user.userId, targetUserId);
  }

  // 家族グループを削除する（管理者だけ）。
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request & { user: SessionUser }): Promise<void> {
    await this.households.remove(req.user.userId);
  }
}
