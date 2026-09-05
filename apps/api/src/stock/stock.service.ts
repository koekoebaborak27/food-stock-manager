import { Injectable } from "@nestjs/common";
import type { Prisma, StorageType, UnitType } from "@prisma/client";
import { Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { StockListQuery, StockSort } from "./validation";

export interface StockListItem {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: string | null;
  isHomemade: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 常備食を家族グループごとに取得する。削除済みと消費済みの食品は一覧から常に除く。
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // ログインしている利用者が所属する家族グループの常備食一覧を返す。
  async list(userId: string, query: StockListQuery): Promise<{ items: StockListItem[] }> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }

    const where: Prisma.StockWhereInput = {
      householdId: membership.householdId,
      deletedAt: null,
      consumedAt: null,
      ...(query.storageType ? { storageType: query.storageType } : {}),
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
      ...(query.urgentOnly ? createUrgentWhere() : {}),
    };
    const stocks = await this.prisma.stock.findMany({ where, orderBy: createOrderBy(query.sort) });
    return { items: stocks.map(toListItem) };
  }
}

// 今日・明日が期限の食品だけを選ぶ条件を、日本時間の日付で作る。
function createUrgentWhere(now = new Date()): Prisma.StockWhereInput {
  const today = getJapanDate(now);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { expiresOn: { not: null, lte: tomorrow } };
}

// 指定された並び順をPrismaの並び順へ変換する。期限なしは期限順の末尾に置く。
function createOrderBy(sort: StockSort): Prisma.StockOrderByWithRelationInput[] {
  if (sort === "CREATED") {
    return [{ createdAt: "desc" }];
  }
  if (sort === "NAME") {
    return [{ name: "asc" }];
  }
  return [{ expiresOn: { sort: "asc", nulls: "last" } }];
}

// 現在時刻から日本時間の暦日を、データベースの日付列と比較できるUTCの午前0時へ変換する。
function getJapanDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((values, part) => {
      values[part.type] = part.value;
      return values;
    }, {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}

// Prismaの日付型をAPIで決めたYYYY-MM-DD文字列へ変換する。
function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// 一覧画面に必要な項目だけをAPI応答へ変換する。
function toListItem(stock: {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: Date | null;
  isHomemade: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StockListItem {
  return {
    ...stock,
    expiresOn: stock.expiresOn ? toDateString(stock.expiresOn) : null,
  };
}
