import { HttpStatus, Injectable } from "@nestjs/common";
import type { Membership, Prisma, StorageType, UnitType } from "@prisma/client";
import { AppError, Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { StockInput, StockListQuery, StockSort } from "./validation";

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

export interface StockDetail extends StockListItem {
  memo: string | null;
}

// 常備食を家族グループごとに取得する。削除済みと消費済みの食品は一覧から常に除く。
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // ログインしている利用者が所属する家族グループの常備食一覧を返す。
  async list(userId: string, query: StockListQuery): Promise<{ items: StockListItem[] }> {
    const membership = await this.getMembership(userId);

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

  // 常備食1件を、編集画面が読む形で返す。他の家族グループのものは404にする。
  async get(userId: string, id: string): Promise<StockDetail> {
    const membership = await this.getMembership(userId);
    const stock = await this.prisma.stock.findFirst({
      where: { id, householdId: membership.householdId, deletedAt: null },
    });
    if (!stock) {
      throw stockNotFound();
    }
    return toDetail(stock);
  }

  // 常備食を登録する。同じ家族グループに同名の未削除・未消費の食品があるかも合わせて返す。
  async create(
    userId: string,
    input: StockInput,
  ): Promise<StockDetail & { duplicateName: boolean }> {
    const membership = await this.getMembership(userId);
    const duplicate = await this.prisma.stock.findFirst({
      where: {
        householdId: membership.householdId,
        deletedAt: null,
        consumedAt: null,
        name: input.name,
      },
      select: { id: true },
    });
    const created = await this.prisma.stock.create({
      data: {
        householdId: membership.householdId,
        name: input.name,
        storageType: input.storageType,
        quantity: input.quantity,
        unit: input.unit,
        expiresOn: input.expiresOn ? new Date(input.expiresOn) : null,
        isHomemade: input.isHomemade,
        memo: input.memo,
        createdById: userId,
        updatedById: userId,
      },
    });
    return { ...toDetail(created), duplicateName: duplicate !== null };
  }

  // 常備食を編集する。画面が読んだupdatedAtと食い違えば更新せずSTOCK_UPDATE_CONFLICTを返す。
  async update(
    userId: string,
    id: string,
    input: StockInput,
    updatedAt: Date,
  ): Promise<StockDetail> {
    const membership = await this.getMembership(userId);
    const result = await this.prisma.stock.updateMany({
      where: { id, householdId: membership.householdId, deletedAt: null, updatedAt },
      data: {
        name: input.name,
        storageType: input.storageType,
        quantity: input.quantity,
        unit: input.unit,
        expiresOn: input.expiresOn ? new Date(input.expiresOn) : null,
        isHomemade: input.isHomemade,
        memo: input.memo,
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      const existing = await this.prisma.stock.findFirst({
        where: { id, householdId: membership.householdId, deletedAt: null },
      });
      if (!existing) {
        throw stockNotFound();
      }
      throw new AppError("STOCK_UPDATE_CONFLICT", HttpStatus.CONFLICT);
    }

    const updated = await this.prisma.stock.findUniqueOrThrow({ where: { id } });
    return toDetail(updated);
  }

  // ログインしている利用者が所属する家族グループを引く。未所属ならNO_HOUSEHOLDにする。
  private async getMembership(userId: string): Promise<Membership> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }
    return membership;
  }
}

// 常備食が見つからないときの失敗。存在しない・削除済み・他の家族グループのものを区別しない
// （02_API共通.md 4）。
function stockNotFound(): AppError {
  return new AppError("STOCK_NOT_FOUND", HttpStatus.NOT_FOUND);
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

interface StockRow {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: UnitType | null;
  expiresOn: Date | null;
  isHomemade: boolean;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 一覧画面に必要な項目だけをAPI応答へ変換する。householdIdなど内部の列は含めない。
function toListItem(stock: StockRow): StockListItem {
  return {
    id: stock.id,
    name: stock.name,
    storageType: stock.storageType,
    quantity: stock.quantity,
    unit: stock.unit,
    expiresOn: stock.expiresOn ? toDateString(stock.expiresOn) : null,
    isHomemade: stock.isHomemade,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

// 登録・編集画面に必要なメモも含めてAPI応答へ変換する。
function toDetail(stock: StockRow): StockDetail {
  return { ...toListItem(stock), memo: stock.memo };
}
