export type StorageType = "REFRIGERATED" | "FROZEN" | "ROOM_TEMPERATURE";

// 買い物リストの商品が指す元の常備食。未削除のものだけAPIから届く（02_API.md 1節）。
export interface ShoppingItemSourceStock {
  id: string;
  storageType: StorageType;
  consumedAt: string | null;
}

// GET /api/shopping-items の一覧1件分。
export interface ShoppingItemListItem {
  id: string;
  name: string;
  isPurchased: boolean;
  sourceStockId: string | null;
  createdAt: string;
  updatedAt: string;
  sourceStock: ShoppingItemSourceStock | null;
}

// GET /api/shopping-items の応答。配列を直接返さず、後から情報を足せる形にする。
export interface ShoppingItemListResponse {
  items: ShoppingItemListItem[];
}
