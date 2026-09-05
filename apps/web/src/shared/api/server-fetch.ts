import "server-only";
import { cookies } from "next/headers";
import { ApiError, type ApiErrorBody } from "./api-error";

// バックエンド（NestJS）の置き場所。next.config.tsのrewritesと同じ考え方。
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";
const HTTP_STATUS_NO_CONTENT = 204;

// Server Component / Server Action からバックエンドAPIを呼ぶ。
// ブラウザ経由のfetchと違いCookieが自動で付かないため、手動で転送する。
export async function serverApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return undefined as T;
  }

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const errorBody = (body as { error?: ApiErrorBody }).error;
    throw new ApiError(response.status, errorBody?.code ?? "SERVER_ERROR", errorBody?.details);
  }
  return body as T;
}
