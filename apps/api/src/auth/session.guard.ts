import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { Errors } from "../common/errors/app-error";
import { SessionService, type SessionUser } from "./session.service";

// ログイン中かどうかを確かめ、request.user に利用者情報を詰める。
// 未ログインは401（UNAUTHENTICATED）とする（docs/specs/02_basic-design/00_共通/02_API共通.md）。
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const user = await this.sessions.verify(req);
    if (!user) {
      throw Errors.unauthenticated();
    }
    req.user = user;
    return true;
  }
}
