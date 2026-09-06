import { HttpStatus, Injectable } from "@nestjs/common";
import type { Membership, Prisma, StorageType, UnitType } from "@prisma/client";
import { AppError, Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { ShoppingItemService } from "../shopping-item/shopping-item.service";
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
  createdByName: string | null;
  updatedByName: string | null;
}

// 消費済リストの1件分。表示に使う項目だけを持つ（13_消費済リスト.md 1節）。
export interface ConsumedStockItem {
  id: string;
  name: string;
  storageType: StorageType;
  unit: UnitType | null;
  consumedAt: Date;
}

// 作成者・更新者の表示名を一緒に取得するためのinclude句。退会した利用者はcreatedById等が
// 空になるため、その場合はtoDetailでnullへ変換し「退会したメンバー」表示に委ねる。
const detailInclude = {
  createdBy: { select: { displayName: true } },
  updatedBy: { select: { displayName: true } },
} satisfies Prisma.StockInclude;

// 常備食を家族グループごとに取得する。削除済みと消費済みの食品は一覧から常に除く。
@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shoppingItems: ShoppingItemService,
  ) {}

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

  // 常備食1件を、編集・詳細画面が読む形で返す。他の家族グループのものは404にする。
  async get(userId: string, id: string): Promise<StockDetail> {
    const membership = await this.getMembership(userId);
    const stock = await this.prisma.stock.findFirst({
      where: { id, householdId: membership.householdId, deletedAt: null },
      include: detailInclude,
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
      include: detailInclude,
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

    const updated = await this.prisma.stock.findUniqueOrThrow({
      where: { id },
      include: detailInclude,
    });
    return toDetail(updated);
  }

  // 残数を1増減する。更新の競合は確認せず、データベース側で差分を足し引きする
  // （00_常備食管理共通.md 4節）。0未満にはしない。
  async adjustQuantity(userId: string, id: string, delta: number): Promise<StockDetail> {
    const membership = await this.getMembership(userId);
    const where: Prisma.StockWhereInput = {
      id,
      householdId: membership.householdId,
      deletedAt: null,
    };

    if (delta > 0) {
      const result = await this.prisma.stock.updateMany({
        where,
        data: { quantity: { increment: delta }, updatedById: userId },
      });
      if (result.count === 0) {
        throw stockNotFound();
      }
    } else {
      // すでに0のときはquantity: {gt: 0}に一致せず更新されない。それ自体は成功として扱い、
      // 対象が存在しない場合とだけ区別する。
      const result = await this.prisma.stock.updateMany({
        where: { ...where, quantity: { gt: 0 } },
        data: { quantity: { increment: delta }, updatedById: userId },
      });
      if (result.count === 0) {
        const existing = await this.prisma.stock.findFirst({ where });
        if (!existing) {
          throw stockNotFound();
        }
      }
    }

    const updated = await this.prisma.stock.findFirst({ where, include: detailInclude });
    if (!updated) {
      throw stockNotFound();
    }
    return toDetail(updated);
  }

  // 常備食を消費済にする。addToShoppingListがtrueなら、消費済にする前に食品名を商品名として
  // 買い物リストへ追加する。同名の未購入商品がすでにあれば追加を省き、消費済への変更だけ完了する。
  // それ以外の失敗（追加元の常備食が見つからない等）では、消費済への変更もせず終える
  // （00_買い物リスト共通.md 2節）。
  async consume(
    userId: string,
    id: string,
    addToShoppingList: boolean,
  ): Promise<{ duplicateShoppingItem: boolean }> {
    const membership = await this.getMembership(userId);
    const stock = await this.prisma.stock.findFirst({
      where: { id, householdId: membership.householdId, deletedAt: null, consumedAt: null },
      select: { id: true },
    });
    if (!stock) {
      throw stockNotFound();
    }

    let duplicateShoppingItem = false;
    if (addToShoppingList) {
      try {
        await this.shoppingItems.addItem(userId, { sourceStockId: stock.id });
      } catch (error) {
        if (error instanceof AppError && error.code === "SHOPPING_ITEM_ALREADY_EXISTS") {
          duplicateShoppingItem = true;
        } else {
          throw error;
        }
      }
    }

    const result = await this.prisma.stock.updateMany({
      where: { id, householdId: membership.householdId, deletedAt: null, consumedAt: null },
      data: { consumedAt: new Date(), updatedById: userId },
    });
    if (result.count === 0) {
      throw stockNotFound();
    }
    return { duplicateShoppingItem };
  }

  // 常備食を取り消す（削除）。編集と同様にupdatedAtで更新の競合を確認する。
  async remove(userId: string, id: string, updatedAt: Date): Promise<void> {
    const membership = await this.getMembership(userId);
    const result = await this.prisma.stock.updateMany({
      where: { id, householdId: membership.householdId, deletedAt: null, updatedAt },
      data: { deletedAt: new Date(), updatedById: userId },
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
  }

  // 消費済リストを、消費済にした日付の新しい順で返す。
  async listConsumed(userId: string): Promise<{ items: ConsumedStockItem[] }> {
    const membership = await this.getMembership(userId);
    const stocks = await this.prisma.stock.findMany({
      where: { householdId: membership.householdId, deletedAt: null, consumedAt: { not: null } },
      orderBy: { consumedAt: "desc" },
    });
    return { items: stocks.map(toConsumedItem) };
  }

  // 消費済食品の食品名・保存区分・単位を引き継ぎ、残数1・期限なしの新しい常備食を作る。
  // 作成者・作り置き・メモは引き継がない（13_消費済リスト.md 2節）。
  async reRegister(userId: string, id: string): Promise<StockDetail> {
    const membership = await this.getMembership(userId);
    const consumed = await this.prisma.stock.findFirst({
      where: {
        id,
        householdId: membership.householdId,
        deletedAt: null,
        consumedAt: { not: null },
      },
    });
    if (!consumed) {
      throw stockNotFound();
    }
    const created = await this.prisma.stock.create({
      data: {
        householdId: membership.householdId,
        name: consumed.name,
        storageType: consumed.storageType,
        quantity: 1,
        unit: consumed.unit,
        expiresOn: null,
        isHomemade: false,
        memo: null,
        createdById: userId,
        updatedById: userId,
      },
      include: detailInclude,
    });
    return toDetail(created);
  }

  // 削除を元に戻す。5秒以内かどうかはフロントエンドが判断し、過ぎたら呼ばない。
  async restore(userId: string, id: string): Promise<void> {
    const membership = await this.getMembership(userId);
    const result = await this.prisma.stock.updateMany({
      where: { id, householdId: membership.householdId, deletedAt: { not: null } },
      data: { deletedAt: null, updatedById: userId },
    });
    if (result.count === 0) {
      throw stockNotFound();
    }
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
  createdBy?: { displayName: string | null } | null;
  updatedBy?: { displayName: string | null } | null;
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

// 消費済リストに必要な項目だけをAPI応答へ変換する。
function toConsumedItem(stock: StockRow & { consumedAt: Date | null }): ConsumedStockItem {
  return {
    id: stock.id,
    name: stock.name,
    storageType: stock.storageType,
    unit: stock.unit,
    // whereでconsumedAt: {not: null}を条件にしているため、ここでは必ず値が入っている。
    consumedAt: stock.consumedAt as Date,
  };
}

// 登録・編集・詳細画面に必要なメモ・作成者・更新者も含めてAPI応答へ変換する。
// 退会した利用者はcreatedBy/updatedByがnullになるため、そのまま画面側の
// 「退会したメンバー」表示に委ねる（00_画面共通.md 5節）。
function toDetail(stock: StockRow): StockDetail {
  return {
    ...toListItem(stock),
    memo: stock.memo,
    createdByName: stock.createdBy?.displayName ?? null,
    updatedByName: stock.updatedBy?.displayName ?? null,
  };
}
