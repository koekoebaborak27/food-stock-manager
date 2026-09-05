import "server-only";
import { serverApiFetch } from "@/shared/api/server-fetch";
import type { StockDetail } from "./types";

// 編集画面に表示する常備食1件を取得する。
export function getStock(id: string): Promise<StockDetail> {
  return serverApiFetch<StockDetail>(`/api/stocks/${id}`);
}
