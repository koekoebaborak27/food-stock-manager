import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { Errors } from "../common/errors/app-error";

// 内部配信APIの認証。ログインのセッション（Cookie）は使わず、Cloud Schedulerが付ける
// ヘッダーの合言葉が環境変数と一致するかだけを確かめる（40_期限通知/02_API.md 3節）。
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const expected = process.env.INTERNAL_NOTIFICATION_SECRET;
    const actual = req.header("X-Internal-Secret");
    if (!expected || actual !== expected) {
      throw Errors.internalUnauthorized();
    }
    return true;
  }
}
