import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  computeSessionExpiry,
  generateSessionToken,
  hashSessionToken,
  isSessionExpired,
} from "./session-token";

export interface SessionUser {
  userId: string;
  householdId: string | null;
  role: "ADMIN" | "MEMBER" | null;
}

// セッションCookieの発行・検証・失効をまとめる。
// 実装方針は docs/specs/03_detail-design/10_認証と家族グループ/01_セッション設計.md のとおり。
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  // ログイン成功時にセッションを作り、Cookieへ生トークンを積む。
  async issue(userId: string, res: Response): Promise<void> {
    const rawToken = generateSessionToken();
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(rawToken),
        expiresAt: computeSessionExpiry(new Date()),
      },
    });
    this.setCookie(res, rawToken);
  }

  // Cookieのトークンから利用者を引く。有効なら期限を延長する。
  async verify(req: Request): Promise<SessionUser | null> {
    const rawToken = this.readCookie(req);
    if (!rawToken) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(rawToken) },
    });
    if (!session) {
      return null;
    }

    const now = new Date();
    if (isSessionExpired(session.expiresAt, now)) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: computeSessionExpiry(now) },
    });

    const membership = await this.prisma.membership.findUnique({
      where: { userId: session.userId },
    });

    return {
      userId: session.userId,
      householdId: membership?.householdId ?? null,
      role: membership?.role ?? null,
    };
  }

  // ログアウト・退会でセッションを失効させる。
  async revoke(req: Request, res: Response): Promise<void> {
    const rawToken = this.readCookie(req);
    if (rawToken) {
      await this.prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } });
    }
    res.clearCookie(SESSION_COOKIE_NAME);
  }

  private readCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
  }

  private setCookie(res: Response, rawToken: string): void {
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    });
  }
}
