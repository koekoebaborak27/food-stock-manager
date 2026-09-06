import { HttpStatus } from "@nestjs/common";
import type { StorageType } from "@prisma/client";
import { AppError, Errors } from "../common/errors/app-error";

const MAX_NAME_LENGTH = 30;
const STORAGE_TYPES: readonly StorageType[] = ["REFRIGERATED", "FROZEN", "ROOM_TEMPERATURE"];

export type AddShoppingItemInput = { name: string } | { sourceStockId: string };

// 購入状態を変える入力。常備食へ戻す場合だけstorageTypeを持つ
// （02_API.md 1節「returnToStockがtrueの場合は保存区分を必ず送る」）。
export type PurchasedUpdateInput =
  | { isPurchased: false }
  | { isPurchased: true; returnToStock: false }
  | { isPurchased: true; returnToStock: true; storageType: StorageType };

// 購入状態を変える入力を確かめる。isPurchased・updatedAtの型違反はVALIDATION_ERROR、
// returnToStock・storageTypeの組み合わせ違反はINVALID_PURCHASE_UPDATEにする
// （02_API.md 1節）。
export function validatePurchasedInput(body: Record<string, unknown>): PurchasedUpdateInput {
  if (typeof body.isPurchased !== "boolean") {
    throw Errors.validation({ field: "isPurchased" });
  }

  if (!body.isPurchased) {
    if (body.returnToStock !== undefined || body.storageType !== undefined) {
      throw invalidPurchaseUpdate();
    }
    return { isPurchased: false };
  }

  if (typeof body.returnToStock !== "boolean") {
    throw invalidPurchaseUpdate();
  }
  if (!body.returnToStock) {
    if (body.storageType !== undefined) {
      throw invalidPurchaseUpdate();
    }
    return { isPurchased: true, returnToStock: false };
  }
  if (!STORAGE_TYPES.includes(body.storageType as StorageType)) {
    throw invalidPurchaseUpdate();
  }
  return { isPurchased: true, returnToStock: true, storageType: body.storageType as StorageType };
}

// 編集・削除で読んだときのupdatedAtを確かめる。画面が読んだ値をそのまま送り返してもらう
// ため、日時として解釈できない値は入力チェックの失敗として扱う（stock/validation.tsと同じ方式）。
export function validateUpdatedAt(value: unknown): Date {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw Errors.validation({ field: "updatedAt" });
}

function invalidPurchaseUpdate(): AppError {
  return new AppError("INVALID_PURCHASE_UPDATE", HttpStatus.BAD_REQUEST);
}

// 買い物リストへの追加の入力を確かめる。直接入力(name)と常備食から(sourceStockId)は
// 必ずどちらか一方だけを受け付ける。両方指定・両方省略はVALIDATION_ERRORとする
// （docs/specs/02_basic-design/30_買い物リスト/02_API.md 3節）。
export function validateAddShoppingItemInput(body: Record<string, unknown>): AddShoppingItemInput {
  const hasName = typeof body.name === "string";
  const hasSourceStockId = typeof body.sourceStockId === "string";

  if (hasName === hasSourceStockId) {
    throw Errors.validation({ fields: ["name", "sourceStockId"] });
  }

  if (hasSourceStockId) {
    return { sourceStockId: body.sourceStockId as string };
  }

  const trimmed = (body.name as string).trim();
  if (trimmed.length === 0) {
    throw new AppError("SHOPPING_ITEM_NAME_REQUIRED", HttpStatus.BAD_REQUEST);
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError("SHOPPING_ITEM_NAME_TOO_LONG", HttpStatus.BAD_REQUEST);
  }
  return { name: trimmed };
}
