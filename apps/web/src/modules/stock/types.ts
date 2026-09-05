export type StorageType = "REFRIGERATED" | "FROZEN" | "ROOM_TEMPERATURE";

export type StockSort = "EXPIRY" | "CREATED" | "NAME";

// GET /api/stocks の一覧1件分。画面で表示する値だけを持つ。
export interface StockListItem {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: "PIECE" | "BAG" | "PACK" | "SERVING" | "BOTTLE" | "GOTO" | null;
  expiresOn: string | null;
  isHomemade: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /api/stocks の応答。配列を直接返さず、後から情報を足せる形にする。
export interface StockListResponse {
  items: StockListItem[];
}
