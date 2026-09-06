import { HttpStatus } from "@nestjs/common";
import { AppError, Errors } from "../common/errors/app-error";

const MAX_NAME_LENGTH = 30;

export type AddShoppingItemInput = { name: string } | { sourceStockId: string };

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
