import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AppError } from "../errors/app-error";

// すべての失敗をここで {error:{code,details}} の形に整える。
// ログ出力もこの1か所だけで行う（業務コードにtry/catchやログを書かせないため）。
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<
      Request & { user?: { userId?: string; householdId?: string | null } }
    >();
    const res = ctx.getResponse<Response>();

    const { status, code, details } = this.toResponse(exception);

    this.logger.warn(
      `${req.method} ${req.path} ${status} ${code} user=${req.user?.userId ?? "-"} household=${req.user?.householdId ?? "-"}`,
    );

    res
      .status(status)
      .json(details === undefined ? { error: { code } } : { error: { code, details } });
  }

  private toResponse(exception: unknown): {
    status: number;
    code: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof AppError) {
      return { status: exception.httpStatus, code: exception.code, details: exception.details };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, code: this.codeForStatus(status) };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: "SERVER_ERROR" };
  }

  // Nest組み込みの例外（Passportガード等が投げるもの）を、この機能の応答形に合わせる。
  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_ERROR";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHENTICATED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "TOO_MANY_REQUESTS";
      default:
        return "SERVER_ERROR";
    }
  }
}
