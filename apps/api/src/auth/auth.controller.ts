import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import type { GoogleProfile } from "./google.strategy";
import { SessionGuard } from "./session.guard";
import { SessionService, type SessionUser } from "./session.service";

interface SessionResponse {
  displayName: string | null;
  avatarUrl: string | null;
  household: { id: string; role: "ADMIN" | "MEMBER" } | null;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
  ) {}

  // ブラウザをGoogleの認可画面へ移す。リダイレクトそのものはPassportのGoogle戦略が行う。
  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleLogin(): void {}

  // Googleからの戻りを受け、利用者を登録・更新してセッションを発行し、画面へ戻す。
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ): Promise<void> {
    const userId = await this.authService.loginWithGoogle(req.user);
    await this.sessions.issue(userId, res);
    res.redirect(process.env.WEB_BASE_URL ?? "http://localhost:3000");
  }

  // セッションを失効させる。
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.sessions.revoke(req, res);
  }

  // ログイン状態と、表示に必要な最小限の情報を返す。未ログインはSessionGuardが401を投げる。
  @Get("session")
  @UseGuards(SessionGuard)
  async session(@Req() req: Request & { user: SessionUser }): Promise<SessionResponse> {
    const profile = await this.authService.getProfile(req.user.userId);
    return {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      household:
        req.user.householdId && req.user.role
          ? { id: req.user.householdId, role: req.user.role }
          : null,
    };
  }
}
