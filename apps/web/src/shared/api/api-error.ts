// バックエンドの失敗応答（{ error: { code, details } }、02_API共通.md）を表す。
// 画面側はcodeで表示する文言を選ぶ。
export interface ApiErrorBody {
  code: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}
