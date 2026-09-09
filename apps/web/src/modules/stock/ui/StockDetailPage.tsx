"use client";

import {
  ArrowLeft,
  Archive,
  CookingPot,
  Minus,
  Plus,
  Refrigerator,
  Snowflake,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { formatDateOnly, formatDateTime } from "@/shared/format/date";
import { showErrorToast } from "@/shared/ui/toast";
import { setPendingDeleteUndo } from "../delete-undo";
import { messageForCode } from "../error-messages";
import { setPendingSaveToast } from "../save-toast";
import { formatQuantity } from "../stock-list-helpers";
import type { StockDetail, StorageType } from "../types";

const storageLabels: Record<StorageType, { label: string; Icon: typeof Refrigerator }> = {
  REFRIGERATED: { label: "冷蔵", Icon: Refrigerator },
  FROZEN: { label: "冷凍", Icon: Snowflake },
  ROOM_TEMPERATURE: { label: "常温", Icon: Archive },
};

// 常備食の詳細画面。カードから開く子画面のため下部タブは出さない
// （docs/specs/02_basic-design/20_常備食管理/12_常備食の詳細.md）。
export function StockDetailPage({ stock: initialStock }: { stock: StockDetail }) {
  const router = useRouter();
  const [stock, setStock] = useState(initialStock);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [consumeSheetOpen, setConsumeSheetOpen] = useState(false);

  const storage = storageLabels[stock.storageType];

  // 対象が見つからなくなっていた場合（他の利用者が削除・消費済にした）は
  // 操作させず一覧へ戻す（12_常備食の詳細.md 3節）。
  function handleActionError(error: unknown): void {
    if (error instanceof ApiError && error.code === "STOCK_NOT_FOUND") {
      showErrorToast(messageForCode(error.code));
      router.push("/");
      return;
    }
    showErrorToast(messageForCode(error instanceof ApiError ? error.code : "SERVER_ERROR"));
  }

  function handleAdjustQuantity(delta: 1 | -1): void {
    startTransition(async () => {
      try {
        const updated = await clientApiFetch<StockDetail>(`/api/stocks/${stock.id}/quantity`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta }),
        });
        setStock(updated);
        // 残数を減らした結果0になった場合だけ、消費済にするかどうかを選ぶシートを出す。
        if (delta === -1 && updated.quantity === 0) {
          setConsumeSheetOpen(true);
        }
      } catch (error) {
        handleActionError(error);
      }
    });
  }

  // 在庫切れシートの選択を確定する。addToShoppingListがtrueのときは、消費済にする前に
  // 食品名を商品名として買い物リストへ追加する（00_買い物リスト共通.md 2節）。
  // 同名の未購入商品がすでにあった場合はduplicateShoppingItemがtrueで返り、
  // 消費済への変更は完了したうえで重複の文言を帯に出す（10_買い物リスト.md 7節）。
  function handleConsume(addToShoppingList: boolean): void {
    setConsumeSheetOpen(false);
    startTransition(async () => {
      try {
        const result = await clientApiFetch<{ duplicateShoppingItem: boolean }>(
          `/api/stocks/${stock.id}/consume`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addToShoppingList }),
          },
        );
        if (addToShoppingList) {
          setPendingSaveToast(
            result.duplicateShoppingItem
              ? messageForCode("SHOPPING_ITEM_ALREADY_EXISTS")
              : "買い物リストに追加しました",
          );
        }
        router.push("/");
      } catch (error) {
        handleActionError(error);
      }
    });
  }

  function handleDelete(): void {
    setDeleteConfirmOpen(false);
    startTransition(async () => {
      try {
        await clientApiFetch(`/api/stocks/${stock.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updatedAt: stock.updatedAt }),
        });
        setPendingDeleteUndo(stock.id, stock.name);
        router.push("/");
      } catch (error) {
        // 表示してから他の利用者が先に変更していた場合は、削除を諦めて
        // 「読み込み直す」ダイアログへ誘導する（updatedAtが送った値と食い違う失敗）。
        if (error instanceof ApiError && error.code === "STOCK_UPDATE_CONFLICT") {
          setConflictOpen(true);
          return;
        }
        handleActionError(error);
      }
    });
  }

  // 競合ダイアログの「読み込み直す」。最新の内容を読み直す。
  async function handleReload(): Promise<void> {
    try {
      const latest = await clientApiFetch<StockDetail>(`/api/stocks/${stock.id}`);
      setStock(latest);
    } catch (error) {
      handleActionError(error);
    } finally {
      setConflictOpen(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6 pb-12">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="戻る" className="text-muted-foreground">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">{stock.name}</h1>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
          <storage.Icon aria-hidden="true" className="size-3" />
          {storage.label}
        </span>
        {stock.isHomemade ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
            <CookingPot aria-hidden="true" className="size-3" />
            作り置き
          </span>
        ) : null}
      </div>

      <section className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">残数</span>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            aria-label="残数を1減らす"
            disabled={isPending || stock.quantity <= 0}
            onClick={() => handleAdjustQuantity(-1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span className="min-w-16 text-center text-2xl font-bold">
            {formatQuantity(stock.quantity, stock.unit)}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            aria-label="残数を1増やす"
            disabled={isPending}
            onClick={() => handleAdjustQuantity(1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </section>

      {stock.expiresOn ? (
        <section className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">期限</span>
          <span className="text-base">{formatDateOnly(stock.expiresOn)}</span>
        </section>
      ) : null}

      {stock.memo ? (
        <section className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">メモ</span>
          <p className="text-base whitespace-pre-wrap">{stock.memo}</p>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button asChild className="h-11 w-full rounded-full">
          <Link href={`/stocks/${stock.id}/edit`}>編集する</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
          disabled={isPending}
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          削除する
        </Button>
      </div>

      <section className="flex flex-col gap-1 border-t pt-4 text-sm text-muted-foreground">
        <p>
          作成: {stock.createdByName ?? "退会したメンバー"} ・ {formatDateTime(stock.createdAt)}
        </p>
        <p>
          更新: {stock.updatedByName ?? "退会したメンバー"} ・ {formatDateTime(stock.updatedAt)}
        </p>
      </section>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{stock.name}」を削除しますか</AlertDialogTitle>
            <AlertDialogDescription>
              一覧から消えます。消費済リストにも残りません。食べ終えた場合は、削除ではなく残数を0にしてください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ご家族の誰かが先に変更しました。最新の内容を読み込みます。
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              削除できませんでした。最新の内容を読み込み直してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void handleReload()}>読み込み直す</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {consumeSheetOpen ? (
        <div
          className="fixed inset-0 z-20 flex items-end bg-foreground/20"
          role="dialog"
          aria-modal="true"
          aria-label="在庫がなくなりました"
        >
          <div className="w-full rounded-t-xl bg-popover p-4">
            <h2 className="mb-3 text-lg font-bold">在庫がなくなりました</h2>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                className="justify-start"
                disabled={isPending}
                onClick={() => handleConsume(false)}
              >
                消費済にする
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="justify-start"
                disabled={isPending}
                onClick={() => handleConsume(true)}
              >
                消費済にして、買い物リストに追加する
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="justify-start"
                disabled={isPending}
                onClick={() => setConsumeSheetOpen(false)}
              >
                そのままにする
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => setConsumeSheetOpen(false)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
