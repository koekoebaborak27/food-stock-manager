import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import type { SessionUser } from "../auth/session.service";
import { InvitationService, type InvitationView } from "./invitation.service";
import { validateInvitationCode } from "./validation";

interface RedeemInvitationBody {
  code?: unknown;
}

@Controller("invitations")
@UseGuards(SessionGuard)
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  // 招待コードを発行・再表示する。
  @Post()
  async issueOrShow(@Req() req: Request & { user: SessionUser }): Promise<InvitationView> {
    return this.invitations.issueOrShow(req.user.userId);
  }

  // 招待コードで参加する。
  @Post("redeem")
  @HttpCode(HttpStatus.CREATED)
  async redeem(
    @Req() req: Request & { user: SessionUser },
    @Body() body: RedeemInvitationBody,
  ): Promise<{ householdId: string }> {
    const code = validateInvitationCode(body.code);
    return this.invitations.redeem(req.user.userId, code);
  }
}
