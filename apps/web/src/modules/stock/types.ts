export type StorageType = "REFRIGERATED" | "FROZEN" | "ROOM_TEMPERATURE";

export type UnitType = "PIECE" | "BAG" | "PACK" | "SERVING" | "BOTTLE" | "GOTO";

export type StockSort = "EXPIRY" | "CREATED" | "NAME";

// GET /api/stocks の一覧1件分。画面で表示する値だけを持つ。
export interface StockListItem {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: string | null;
  isHomemade: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /api/stocks の応答。配列を直接返さず、後から情報を足せる形にする。
export interface StockListResponse {
  items: StockListItem[];
}

// GET /api/stocks/{id}・POST /api/stocks・PUT /api/stocks/{id}・
// PATCH /api/stocks/{id}/quantity が扱う1件分。一覧の項目にメモと作成者・更新者名を足したもの。
// 退会したメンバーはnullになる（00_画面共通.md 5節）。
export interface StockDetail extends StockListItem {
  memo: string | null;
  createdByName: string | null;
  updatedByName: string | null;
}

// GET /api/stocks/consumed の一覧1件分。消費済リストの表示に使う項目だけを持つ。
export interface ConsumedStockItem {
  id: string;
  name: string;
  storageType: StorageType;
  unit: UnitType | null;
  consumedAt: string;
}

// GET /api/stocks/consumed の応答。
export interface ConsumedStockListResponse {
  items: ConsumedStockItem[];
}

// POST /api/stocks・PUT /api/stocks/{id} に送る登録・編集フォームの入力値。
export interface StockInput {
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: string | null;
  isHomemade: boolean;
  memo: string | null;
}
