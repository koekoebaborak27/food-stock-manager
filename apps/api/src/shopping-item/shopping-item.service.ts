import { Injectable } from "@nestjs/common";
import type { Membership, StorageType } from "@prisma/client";
import { Errors } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";

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

  // ログインしている利用者が所属する家族グループを引く。未所属ならNO_HOUSEHOLDにする。
  private async getMembership(userId: string): Promise<Membership> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      throw Errors.noHousehold();
    }
    return membership;
  }
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
