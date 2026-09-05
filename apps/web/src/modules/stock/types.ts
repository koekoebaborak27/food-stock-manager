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

// GET /api/stocks/{id}・POST /api/stocks・PUT /api/stocks/{id} が扱う1件分。
// 一覧の項目にメモを足したもの。
export interface StockDetail extends StockListItem {
  memo: string | null;
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
