import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { SessionGuard } from "../auth/session.guard";
import { SessionService, type SessionUser } from "../auth/session.service";
import { Errors } from "../common/errors/app-error";
import { UsersService } from "./users.service";

interface UpdateProfileBody {
  displayName?: unknown;
}

// 表示名を確かめ、保存用に前後の空白を取り除く。
function validateDisplayName(displayName: unknown): string {
  const trimmed = typeof displayName === "string" ? displayName.trim() : "";
  if (trimmed.length === 0 || trimmed.length > 20) {
    throw Errors.validation({ field: "displayName" });
  }
  return trimmed;
}

// ログイン済み利用者自身の情報を変更・退会する入口。
@Controller("users")
@UseGuards(SessionGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  // 自分の表示名だけを変更する。
  @Patch("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMe(
    @Req() req: Request & { user: SessionUser },
    @Body() body: UpdateProfileBody,
  ): Promise<void> {
    await this.users.updateDisplayName(req.user.userId, validateDisplayName(body.displayName));
  }

  // 退会する。成功した場合は、このブラウザのセッションCookieも消す。
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(
    @Req() req: Request & { user: SessionUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.users.withdraw(req.user.userId);
    await this.sessions.revoke(req, res);
  }
}
