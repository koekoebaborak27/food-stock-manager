import type { StorageType } from "@prisma/client";
import { Errors } from "../common/errors/app-error";

export type StockSort = "EXPIRY" | "CREATED" | "NAME";

export interface StockListQuery {
  storageType: StorageType | null;
  keyword: string | null;
  sort: StockSort;
  urgentOnly: boolean;
}

// 常備食一覧の問い合わせ文字列を確認する。省略された条件には画面の既定値を入れる。
export function validateStockListQuery(query: Record<string, unknown>): StockListQuery {
  const storageType = validateStorageType(query.storageType);
  const keyword = validateKeyword(query.keyword);
  const sort = validateSort(query.sort);
  const urgentOnly = validateUrgentOnly(query.urgentOnly);
  return { storageType, keyword, sort, urgentOnly };
}

// 保存区分を内部値に変換する。ALLと未指定は絞り込みなしとして扱う。
function validateStorageType(value: unknown): StorageType | null {
  if (value === undefined || value === "ALL") {
    return null;
  }
  if (value === "REFRIGERATED" || value === "FROZEN" || value === "ROOM_TEMPERATURE") {
    return value;
  }
  throw Errors.validation({ field: "storageType" });
}

// 食品名の部分一致条件を確認する。未指定と空文字は絞り込みなしにする。
function validateKeyword(value: unknown): string | null {
  if (value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw Errors.validation({ field: "keyword" });
  }
  return value;
}

// 並び順を内部値に変換する。未指定は期限が近い順にする。
function validateSort(value: unknown): StockSort {
  if (value === undefined || value === "EXPIRY") {
    return "EXPIRY";
  }
  if (value === "CREATED" || value === "NAME") {
    return value;
  }
  throw Errors.validation({ field: "sort" });
}

// 期限が近い食品だけを出すかを確認する。未指定は全件を出す。
function validateUrgentOnly(value: unknown): boolean {
  if (value === undefined || value === "false") {
    return false;
  }
  if (value === "true") {
    return true;
  }
  throw Errors.validation({ field: "urgentOnly" });
}
