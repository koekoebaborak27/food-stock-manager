import { HttpStatus } from "@nestjs/common";

// 業務コードから投げる共通の失敗。docs/specs/02_basic-design/00_共通/02_API共通.md の
// 応答形（{ error: { code, details } }）に、例外フィルターで変換する。
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

// よく使う失敗を定型化したファクトリ。機能固有のcodeが要る場合はAppErrorを直接使う。
export const Errors = {
  unauthenticated: (): AppError => new AppError("UNAUTHENTICATED", HttpStatus.UNAUTHORIZED),
  forbidden: (): AppError => new AppError("FORBIDDEN", HttpStatus.FORBIDDEN),
  noHousehold: (): AppError => new AppError("NO_HOUSEHOLD", HttpStatus.FORBIDDEN),
  notFound: (): AppError => new AppError("NOT_FOUND", HttpStatus.NOT_FOUND),
  validation: (details: Record<string, unknown>): AppError =>
    new AppError("VALIDATION_ERROR", HttpStatus.BAD_REQUEST, details),
  conflict: (code = "CONFLICT"): AppError => new AppError(code, HttpStatus.CONFLICT),
};
