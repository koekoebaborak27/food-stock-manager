import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, type Membership, type Stock, type StorageType } from "@prisma/client";
import { AppError, Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { AddShoppingItemInput, BulkItemRef, PurchasedUpdateInput } from "./validation";

// Prismaの一意索引違反のエラーコード（部分一意索引 ShoppingItem_household_name_unpurchased_key）。
const UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";
// 常備食の残数の上限（00_買い物リスト共通.md 3節）。
const MAX_STOCK_QUANTITY = 99;

// 一覧に表示する、元の常備食の情報。存在しないか削除済みならnullにする。
export interface ShoppingItemSourceStock {
  id: string;
  storageType: StorageType;
  consumedAt: Date | null;
}

export interface ShoppingItemListItem {
  id: string;
  name: string;
  isPurchased: boolean;
  sourceStockId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceStock: ShoppingItemSourceStock | null;
}

// 削除・一括削除・復元の応答（02_API.md 1節）。復元後のupdatedAtを含めることで、
// 画面が次の削除・復元をそのまま送り返せるようにする。
export interface ShoppingItemDeleteResult {
  items: Array<{ id: string; updatedAt: Date }>;
}

interface ShoppingItemRow {
  id: string;
  name: string;
  isPurchased: boolean;
  sourceStockId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceStock: {
    id: string;
    storageType: StorageType;
    consumedAt: Date | null;
    deletedAt: Date | null;
  } | null;
}

// 買い物リストの商品を家族グループごとに取得・更新する。
@Injectable()
export class ShoppingItemService {
  constructor(private readonly prisma: PrismaService) {}

  // 未購入・購入済みを合わせた一覧を返す。未購入を先に、それぞれの中では作成日時の古い順とする
  // （01_データベース.md 1節）。
  async list(userId: string): Promise<{ items: ShoppingItemListItem[] }> {
    const membership = await this.getMembership(userId);
    const items = await this.prisma.shoppingItem.findMany({
      where: { householdId: membership.householdId, deletedAt: null },
      include: {
        sourceStock: { select: { id: true, storageType: true, consumedAt: true, deletedAt: true } },
      },
      orderBy: [{ isPurchased: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    return { items: items.map(toListItem) };
  }

  // 買い物リストへ商品を追加する。直接入力(name)は前後の空白を除いた商品名をそのまま使い、
  // 常備食から(sourceStockId)はその常備食の食品名を写して使う（00_買い物リスト共通.md 2節）。
  async addItem(userId: string, input: AddShoppingItemInput): Promise<ShoppingItemListItem> {
    const membership = await this.getMembership(userId);
    const name =
      "sourceStockId" in input
        ? await this.resolveSourceStockName(membership.householdId, input.sourceStockId)
        : input.name;

    // 事前確認は応答を速くするための最適化。実際の排他制御は下のcatchで行う
    // （03_detail-design/30_買い物リスト/02_重複判定と一括操作の整合性.md 2節）。
    await this.assertNoDuplicate(membership.householdId, name);

    try {
      const created = await this.prisma.shoppingItem.create({
        data: {
          householdId: membership.householdId,
          name,
          sourceStockId: "sourceStockId" in input ? input.sourceStockId : null,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          sourceStock: {
            select: { id: true, storageType: true, consumedAt: true, deletedAt: true },
          },
        },
      });
      return toListItem(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_ERROR_CODE
      ) {
        throw shoppingItemAlreadyExists();
      }
      throw error;
    }
  }

  // 購入状態を変える。未購入→購入済みでreturnToStockがtrueのときだけ、購入状態の変更と
  // 常備食への反映を1つのトランザクションで行う（01_購入時の常備食反映.md）。
  async setPurchased(
    userId: string,
    id: string,
    input: PurchasedUpdateInput,
    updatedAt: Date,
  ): Promise<ShoppingItemListItem> {
    const membership = await this.getMembership(userId);

    if (!input.isPurchased) {
      const result = await this.prisma.shoppingItem.updateMany({
        where: {
          id,
          householdId: membership.householdId,
          deletedAt: null,
          isPurchased: true,
          updatedAt,
        },
        data: { isPurchased: false, updatedById: userId },
      });
      if (result.count === 0) {
        throw shoppingItemUpdateConflict();
      }
      return this.getById(membership.householdId, id);
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shoppingItem.updateMany({
        where: {
          id,
          householdId: membership.householdId,
          deletedAt: null,
          isPurchased: false,
          updatedAt,
        },
        data: { isPurchased: true, updatedById: userId },
      });
      if (result.count === 0) {
        throw shoppingItemUpdateConflict();
      }

      if (!input.returnToStock) {
        return;
      }

      const item = await tx.shoppingItem.findUniqueOrThrow({
        where: { id },
        select: { name: true, sourceStockId: true },
      });
      await this.returnToStock(tx, membership.householdId, userId, item, input.storageType);
    });

    return this.getById(membership.householdId, id);
  }

  // 商品を1件削除する（論理削除）。常備食は変更しない（10_買い物リスト.md 8節）。
  async remove(userId: string, id: string, updatedAt: Date): Promise<ShoppingItemDeleteResult> {
    const membership = await this.getMembership(userId);
    const now = new Date();
    const result = await this.prisma.shoppingItem.updateMany({
      where: { id, householdId: membership.householdId, deletedAt: null, updatedAt },
      data: { deletedAt: now, updatedById: userId, updatedAt: now },
    });
    if (result.count === 0) {
      const existing = await this.prisma.shoppingItem.findFirst({
        where: { id, householdId: membership.householdId, deletedAt: null },
        select: { id: true },
      });
      throw existing ? shoppingItemUpdateConflict() : shoppingItemNotFound();
    }
    return { items: [{ id, updatedAt: now }] };
  }

  // 購入済みを一括削除する。対象全件が購入済み・未削除・依頼のupdatedAtと一致する場合だけ
  // まとめて削除する（03_detail-design/30_買い物リスト/02_重複判定と一括操作の整合性.md 3節）。
  async removePurchased(userId: string, items: BulkItemRef[]): Promise<ShoppingItemDeleteResult> {
    const membership = await this.getMembership(userId);
    return this.prisma.$transaction(async (tx) => {
      const targets = await this.loadBulkTargets(tx, membership.householdId, items);
      for (const { request, actual } of targets) {
        if (
          !actual.isPurchased ||
          actual.deletedAt !== null ||
          actual.updatedAt.getTime() !== request.updatedAt.getTime()
        ) {
          throw shoppingItemUpdateConflict();
        }
      }

      const now = new Date();
      await tx.shoppingItem.updateMany({
        where: { id: { in: items.map((item) => item.id) }, householdId: membership.householdId },
        data: { deletedAt: now, updatedById: userId, updatedAt: now },
      });
      return { items: items.map((item) => ({ id: item.id, updatedAt: now })) };
    });
  }

  // 削除(1件・一括)を元に戻す。対象全件が同じ家族グループ・削除済み・依頼のupdatedAt
  // （削除後のupdatedAt）と一致する場合だけまとめて復元する（同3節）。
  async restore(userId: string, items: BulkItemRef[]): Promise<ShoppingItemDeleteResult> {
    const membership = await this.getMembership(userId);
    return this.prisma.$transaction(async (tx) => {
      const targets = await this.loadBulkTargets(tx, membership.householdId, items);
      for (const { request, actual } of targets) {
        if (
          actual.deletedAt === null ||
          actual.updatedAt.getTime() !== request.updatedAt.getTime()
        ) {
          throw shoppingItemUpdateConflict();
        }
      }

      const now = new Date();
      await tx.shoppingItem.updateMany({
        where: { id: { in: items.map((item) => item.id) }, householdId: membership.householdId },
        data: { deletedAt: null, updatedById: userId, updatedAt: now },
      });
      return { items: items.map((item) => ({ id: item.id, updatedAt: now })) };
    });
  }

  // 一括削除・復元の対象を読む。存在確認は絞り込まずに行い、404と409を正しく出し分ける
  // （同3節「2（存在確認）と3（状態確認）を分けて判定する」）。
  private async loadBulkTargets(
    tx: Prisma.TransactionClient,
    householdId: string,
    items: BulkItemRef[],
  ): Promise<
    Array<{
      request: BulkItemRef;
      actual: { isPurchased: boolean; deletedAt: Date | null; updatedAt: Date };
    }>
  > {
    const found = await tx.shoppingItem.findMany({
      where: { id: { in: items.map((item) => item.id) }, householdId },
      select: { id: true, isPurchased: true, deletedAt: true, updatedAt: true },
    });
    const foundById = new Map(found.map((row) => [row.id, row]));

    return items.map((item) => {
      const actual = foundById.get(item.id);
      if (!actual) {
        throw shoppingItemNotFound();
      }
      return { request: item, actual };
    });
  }

  // 購入時に常備食へ反映する（3節の判定→4節の残数+1、または2節の新規作成）。
  private async returnToStock(
    tx: Prisma.TransactionClient,
    householdId: string,
    userId: string,
    item: { name: string; sourceStockId: string | null },
    storageType: StorageType,
  ): Promise<void> {
    const sourceStock = item.sourceStockId
      ? await tx.stock.findFirst({
          where: { id: item.sourceStockId, householdId, deletedAt: null },
        })
      : null;

    const canIncrement =
      sourceStock !== null &&
      sourceStock.consumedAt === null &&
      sourceStock.storageType === storageType;

    if (canIncrement) {
      const incremented = await this.tryIncrement(
        tx,
        householdId,
        userId,
        sourceStock,
        storageType,
      );
      if (incremented) {
        return;
      }
    }

    await tx.stock.create({
      data: {
        householdId,
        name: sourceStock ? sourceStock.name : item.name,
        storageType,
        quantity: 1,
        unit: null,
        expiresOn: null,
        isHomemade: false,
        memo: null,
        consumedAt: null,
        deletedAt: null,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  // 元の常備食の残数を条件付きupdateManyで+1する。上限到達で失敗した場合は
  // SOURCE_STOCK_QUANTITY_LIMITを投げ、それ以外(3節の条件が崩れていた場合)は
  // falseを返して新規作成へ切り替えさせる（04節）。
  private async tryIncrement(
    tx: Prisma.TransactionClient,
    householdId: string,
    userId: string,
    sourceStock: Stock,
    storageType: StorageType,
  ): Promise<boolean> {
    const result = await tx.stock.updateMany({
      where: {
        id: sourceStock.id,
        householdId,
        deletedAt: null,
        consumedAt: null,
        storageType,
        quantity: { lt: MAX_STOCK_QUANTITY },
      },
      data: { quantity: { increment: 1 }, updatedById: userId },
    });
    if (result.count === 1) {
      return true;
    }

    const recheck = await tx.stock.findFirst({ where: { id: sourceStock.id, householdId } });
    const stillMatches =
      recheck !== null &&
      recheck.deletedAt === null &&
      recheck.consumedAt === null &&
      recheck.storageType === storageType;
    if (stillMatches) {
      throw new AppError("SOURCE_STOCK_QUANTITY_LIMIT", HttpStatus.CONFLICT);
    }
    return false;
  }

  // 更新後の商品1件を一覧と同じ形で読み直す。
  private async getById(householdId: string, id: string): Promise<ShoppingItemListItem> {
    const item = await this.prisma.shoppingItem.findFirstOrThrow({
      where: { id, householdId },
      include: {
        sourceStock: { select: { id: true, storageType: true, consumedAt: true, deletedAt: true } },
      },
    });
    return toListItem(item);
  }

  // 常備食からの追加元を確かめる。同じ家族グループに属し、削除されていない常備食だけを許す。
  // 消費済のStockは追加できる（00_買い物リスト共通.md 2節）ため、consumedAtは見ない。
  private async resolveSourceStockName(
    householdId: string,
    sourceStockId: string,
  ): Promise<string> {
    const stock = await this.prisma.stock.findFirst({
      where: { id: sourceStockId, householdId, deletedAt: null },
      select: { name: true },
    });
    if (!stock) {
      throw new AppError("SOURCE_STOCK_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    return stock.name;
  }

  // 同じ家族グループに、削除されておらず未購入の同名商品がないかを確かめる。
  private async assertNoDuplicate(householdId: string, name: string): Promise<void> {
    const duplicate = await this.prisma.shoppingItem.findFirst({
      where: { householdId, name, isPurchased: false, deletedAt: null },
      select: { id: true },
    });
    if (duplicate) {
      throw shoppingItemAlreadyExists();
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

function shoppingItemAlreadyExists(): AppError {
  return new AppError("SHOPPING_ITEM_ALREADY_EXISTS", HttpStatus.CONFLICT);
}

// 商品が見つからないときの失敗。存在しない・削除済み・他の家族グループのものを区別しない
// （02_API共通.md 4）。
function shoppingItemNotFound(): AppError {
  return new AppError("SHOPPING_ITEM_NOT_FOUND", HttpStatus.NOT_FOUND);
}

// 対象がない・別世帯・削除済み・購入状態が食い違う・updatedAtが食い違うのいずれかを
// 区別せずまとめる（01_購入時の常備食反映.md 1節）。
function shoppingItemUpdateConflict(): AppError {
  return new AppError("SHOPPING_ITEM_UPDATE_CONFLICT", HttpStatus.CONFLICT);
}

// 一覧画面に必要な項目だけをAPI応答へ変換する。sourceStockは削除済みならnullとして扱う
// （02_API.md 1節。消費済でも保存区分の初期表示に使うためconsumedAtは残す）。
function toListItem(item: ShoppingItemRow): ShoppingItemListItem {
  return {
    id: item.id,
    name: item.name,
    isPurchased: item.isPurchased,
    sourceStockId: item.sourceStockId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    sourceStock:
      item.sourceStock && item.sourceStock.deletedAt === null
        ? {
            id: item.sourceStock.id,
            storageType: item.sourceStock.storageType,
            consumedAt: item.sourceStock.consumedAt,
          }
        : null,
  };
}
