import type { StorageType, UnitType } from "@prisma/client";
import { Errors } from "../common/errors/app-error";

export type StockSort = "EXPIRY" | "CREATED" | "NAME";

const STORAGE_TYPES: readonly StorageType[] = ["REFRIGERATED", "FROZEN", "ROOM_TEMPERATURE"];
const UNIT_TYPES: readonly UnitType[] = ["PIECE", "BAG", "PACK", "SERVING", "BOTTLE", "GOTO"];
const MAX_NAME_LENGTH = 30;
const MAX_MEMO_LENGTH = 200;
const MIN_QUANTITY = 0;
const MAX_QUANTITY = 99;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface StockInput {
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: string | null;
  isHomemade: boolean;
  memo: string | null;
}

// 常備食の登録・編集の入力を確かめる。引っかかった項目をすべて集め、
// 1件でもあればまとめてVALIDATION_ERRORにする（02_API共通.md 6）。
export function validateStockInput(body: Record<string, unknown>): StockInput {
  const failedFields: string[] = [];
  const input: StockInput = {
    name: validateStockName(body.name, failedFields),
    storageType: validateStorageTypeField(body.storageType, failedFields),
    quantity: validateQuantity(body.quantity, failedFields),
    unit: validateUnit(body.unit, failedFields),
    expiresOn: validateExpiresOn(body.expiresOn, failedFields),
    isHomemade: validateIsHomemade(body.isHomemade, failedFields),
    memo: validateMemo(body.memo, failedFields),
  };

  if (failedFields.length > 0) {
    throw Errors.validation({ fields: failedFields });
  }
  return input;
}

// 編集・削除で読んだときのupdatedAtを確かめる。画面が読んだ値をそのまま送り返してもらう
// ため、日時として解釈できない値は入力チェックの失敗として扱う。
export function validateUpdatedAt(value: unknown): Date {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw Errors.validation({ fields: ["updatedAt"] });
}

function validateStockName(value: unknown, failed: string[]): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    failed.push("name");
  }
  return trimmed;
}

function validateStorageTypeField(value: unknown, failed: string[]): StorageType {
  if (STORAGE_TYPES.includes(value as StorageType)) {
    return value as StorageType;
  }
  failed.push("storageType");
  return "REFRIGERATED";
}

function validateQuantity(value: unknown, failed: string[]): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_QUANTITY &&
    value <= MAX_QUANTITY
  ) {
    return value;
  }
  failed.push("quantity");
  return 0;
}

function validateUnit(value: unknown, failed: string[]): UnitType | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (UNIT_TYPES.includes(value as UnitType)) {
    return value as UnitType;
  }
  failed.push("unit");
  return null;
}

function validateExpiresOn(value: unknown, failed: string[]): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  failed.push("expiresOn");
  return null;
}

function validateIsHomemade(value: unknown, failed: string[]): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  failed.push("isHomemade");
  return false;
}

function validateMemo(value: unknown, failed: string[]): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string" && value.length <= MAX_MEMO_LENGTH) {
    return value;
  }
  failed.push("memo");
  return null;
}

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
