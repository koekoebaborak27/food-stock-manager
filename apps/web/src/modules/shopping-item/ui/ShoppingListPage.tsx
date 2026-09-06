"use client";

import { ChevronDown, ChevronUp, Circle, CircleCheck, Menu, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { showErrorToast, showSuccessToast, showUndoToast } from "@/shared/ui/toast";
import { messageForCode } from "../error-messages";
import type { ShoppingItemListItem, ShoppingItemListResponse, StorageType } from "../types";
import { validateShoppingItemName } from "../validation";

// DELETE .../{id}・DELETE .../purchased の応答（02_API.md 1節）。復元にそのまま使う
// updatedAtを含む。
interface ShoppingItemDeleteResponse {
  items: Array<{ id: string; updatedAt: string }>;
}

// 商品名の直下にエラーを出す失敗（10_買い物リスト.md 7節）。それ以外は帯で伝える。
const INLINE_NAME_ERROR_CODES = new Set([
  "SHOPPING_ITEM_NAME_REQUIRED",
  "SHOPPING_ITEM_NAME_TOO_LONG",
  "SHOPPING_ITEM_ALREADY_EXISTS",
]);

// 購入確認シートの保存区分の選択肢（10_買い物リスト.md 4.1節）。
const storageOptions: Array<{ value: StorageType; label: string }> = [
  { value: "REFRIGERATED", label: "冷蔵" },
  { value: "FROZEN", label: "冷凍" },
  { value: "ROOM_TEMPERATURE", label: "常温" },
];

// 購入確認シートが持つ、対象商品と入力中の選択状態。
interface PurchaseSheetState {
  item: ShoppingItemListItem;
  returnToStock: boolean;
  storageType: StorageType;
  quantityLimitError: string | null;
}

// 買い物リスト画面。下部タブから開き、未購入・購入済みに分けて商品を表示する
// （docs/specs/02_basic-design/30_買い物リスト/10_買い物リスト.md）。
export function ShoppingListPage({ householdName }: { householdName: string }) {
  const [items, setItems] = useState<ShoppingItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPurchasedOpen, setIsPurchasedOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [purchaseSheet, setPurchaseSheet] = useState<PurchaseSheetState | null>(null);
  const [isSubmittingPurchase, startSubmittingPurchase] = useTransition();
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingItemListItem | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Array<{
    id: string;
    updatedAt: string;
  }> | null>(null);
  const [isBulkDeleting, startBulkDeleting] = useTransition();

  // 画面を開いたときだけ読み込む。開いたまま自動更新はしない（10_買い物リスト.md 6節）。
  useEffect(() => {
    void loadItems();
  }, []);

  // APIの成功・失敗を一覧の表示状態へ反映する。開閉状態はここでは変えない
  // （同じ画面で再読込しても開閉状態を保つ、10_買い物リスト.md 1節）。
  async function loadItems(): Promise<void> {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await clientApiFetch<ShoppingItemListResponse>("/api/shopping-items");
      setItems(response.items);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function openAddSheet(): void {
    setItemName("");
    setNameError(null);
    setIsAddSheetOpen(true);
  }

  function handleNameChange(value: string): void {
    setItemName(value);
    if (nameError) {
      setNameError(validateShoppingItemName(value));
    }
  }

  // FABと空表示のボタンから開く、直接入力の追加シート（10_買い物リスト.md 3節）。
  function handleAddSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const error = validateShoppingItemName(itemName);
    if (error) {
      setNameError(error);
      return;
    }

    startAdding(async () => {
      try {
        await clientApiFetch<ShoppingItemListItem>("/api/shopping-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName.trim() }),
        });
        setIsAddSheetOpen(false);
        showSuccessToast("買い物リストに追加しました");
        await loadItems();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "SERVER_ERROR";
        if (INLINE_NAME_ERROR_CODES.has(code)) {
          setNameError(messageForCode(code));
          return;
        }
        showErrorToast(messageForCode(code));
      }
    });
  }

  // 未購入のチェックを入れたときに開く、購入確認シート（10_買い物リスト.md 4.1節）。
  // 保存区分の初期値は、元の常備食が未削除なら消費済でもその保存区分、それ以外は冷蔵にする。
  function openPurchaseSheet(item: ShoppingItemListItem): void {
    setPurchaseSheet({
      item,
      returnToStock: true,
      storageType: item.sourceStock?.storageType ?? "REFRIGERATED",
      quantityLimitError: null,
    });
  }

  // 購入済みのチェックを外す。確認は出さず、常備食も変更しない（10_買い物リスト.md 4節）。
  function handleUnpurchase(item: ShoppingItemListItem): void {
    setPendingItemId(item.id);
    void (async () => {
      try {
        await clientApiFetch(`/api/shopping-items/${item.id}/purchased`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPurchased: false, updatedAt: item.updatedAt }),
        });
        showSuccessToast("未購入に戻しました");
        await loadItems();
      } catch (error) {
        await handleActionError(error);
      } finally {
        setPendingItemId(null);
      }
    })();
  }

  // 購入確認シートの「購入済みにする」。常備食へ戻す選択と保存区分を合わせて送る
  // （02_API.md 1節）。
  function handleConfirmPurchase(): void {
    if (!purchaseSheet) {
      return;
    }
    const { item, returnToStock, storageType } = purchaseSheet;

    startSubmittingPurchase(async () => {
      try {
        await clientApiFetch(`/api/shopping-items/${item.id}/purchased`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            returnToStock
              ? { isPurchased: true, returnToStock: true, storageType, updatedAt: item.updatedAt }
              : { isPurchased: true, returnToStock: false, updatedAt: item.updatedAt },
          ),
        });
        setPurchaseSheet(null);
        showSuccessToast(
          returnToStock ? "購入済みにして、常備食に反映しました" : "購入済みにしました",
        );
        await loadItems();
      } catch (error) {
        if (error instanceof ApiError && error.code === "SOURCE_STOCK_QUANTITY_LIMIT") {
          setPurchaseSheet((current) =>
            current ? { ...current, quantityLimitError: messageForCode(error.code) } : current,
          );
          return;
        }
        setPurchaseSheet(null);
        await handleActionError(error);
      }
    });
  }

  // 購入状態の変更・削除・復元で共通の失敗処理。更新の競合はダイアログ、それ以外は帯で伝えて
  // 一覧を読み直す（10_買い物リスト.md 7節）。
  async function handleActionError(error: unknown): Promise<void> {
    const code = error instanceof ApiError ? error.code : "SERVER_ERROR";
    if (code === "SHOPPING_ITEM_UPDATE_CONFLICT") {
      setIsConflictOpen(true);
      return;
    }
    showErrorToast(messageForCode(code));
    await loadItems();
  }

  // 更新競合ダイアログの「読み込み直す」。開いているシートを閉じて最新の一覧を読み直す
  // （10_買い物リスト.md 7節）。
  async function handleReloadAfterConflict(): Promise<void> {
    setIsConflictOpen(false);
    setPurchaseSheet(null);
    await loadItems();
  }

  // ゴミ箱を押して確認ダイアログを開く（10_買い物リスト.md 5節）。
  function openDeleteDialog(item: ShoppingItemListItem): void {
    setDeleteTarget(item);
  }

  // 削除確認の「削除する」。削除できたら一覧から外し、「元に戻す」付きの帯を5秒出す
  // （10_買い物リスト.md 5節）。
  function handleConfirmDelete(): void {
    if (!deleteTarget) {
      return;
    }
    const target = deleteTarget;
    setDeleteTarget(null);
    setPendingItemId(target.id);
    void (async () => {
      try {
        const response = await clientApiFetch<ShoppingItemDeleteResponse>(
          `/api/shopping-items/${target.id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updatedAt: target.updatedAt }),
          },
        );
        await loadItems();
        showUndoToast(`「${target.name}」を削除しました`, () => void restoreItems(response.items));
      } catch (error) {
        await handleActionError(error);
      } finally {
        setPendingItemId(null);
      }
    })();
  }

  // 「元に戻す」。1件・一括削除のどちらの取り消しにも使う（10_買い物リスト.md 5節）。
  async function restoreItems(items: Array<{ id: string; updatedAt: string }>): Promise<void> {
    try {
      await clientApiFetch("/api/shopping-items/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      showSuccessToast("元に戻しました");
      await loadItems();
    } catch (error) {
      await handleActionError(error);
    }
  }

  // 購入済み見出しの「購入済みを削除する」。確認を開いた時点の対象ID・updatedAtを保持し、
  // 確認後に増えた商品は削除しない（10_買い物リスト.md 5節）。
  function openBulkDeleteDialog(): void {
    setBulkDeleteTargets(purchased.map((item) => ({ id: item.id, updatedAt: item.updatedAt })));
  }

  // 一括削除確認の「削除する」。
  function handleConfirmBulkDelete(): void {
    if (!bulkDeleteTargets) {
      return;
    }
    const targets = bulkDeleteTargets;
    setBulkDeleteTargets(null);
    startBulkDeleting(async () => {
      try {
        const response = await clientApiFetch<ShoppingItemDeleteResponse>(
          "/api/shopping-items/purchased",
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: targets }),
          },
        );
        await loadItems();
        showUndoToast(
          `購入済みの商品を${targets.length}件削除しました`,
          () => void restoreItems(response.items),
        );
      } catch (error) {
        await handleActionError(error);
      }
    });
  }

  const unpurchased = items.filter((item) => !item.isPurchased);
  const purchased = items.filter((item) => item.isPurchased);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-32">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <p className="text-sm text-muted-foreground">{householdName}</p>
          <h1 className="text-2xl font-bold">買い物リスト</h1>
        </div>
        <details className="relative">
          <summary
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent"
            aria-label="メニュー"
          >
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <nav className="absolute top-12 right-0 z-10 flex w-52 flex-col rounded-lg border bg-popover p-2 text-sm shadow-sm">
            <Link href="/household/members" className="rounded-md px-3 py-2 hover:bg-accent">
              メンバーと家族グループ
            </Link>
            <Link href="/notifications" className="rounded-md px-3 py-2 hover:bg-accent">
              通知の設定
            </Link>
            <Link href="/settings" className="rounded-md px-3 py-2 hover:bg-accent">
              アカウントの設定
            </Link>
          </nav>
        </details>
      </header>

      <section className="flex flex-1 flex-col gap-3 px-4" aria-live="polite">
        {isLoading ? <ItemSkeleton /> : null}
        {!isLoading && hasError ? (
          <EmptyState
            message="読み込めませんでした。通信の状態を確かめて、もう一度お試しください。"
            buttonLabel="もう一度読み込む"
            onClick={() => void loadItems()}
          />
        ) : null}
        {!isLoading && !hasError && items.length === 0 ? (
          <EmptyState
            message="買うものはまだありません。"
            buttonLabel="商品を追加する"
            onClick={openAddSheet}
          />
        ) : null}
        {!isLoading && !hasError && items.length > 0 ? (
          <>
            {unpurchased.length > 0 ? (
              unpurchased.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  disabled={pendingItemId === item.id}
                  onToggle={() => openPurchaseSheet(item)}
                  onDelete={() => openDeleteDialog(item)}
                />
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                未購入の商品はありません。
              </p>
            )}

            {purchased.length > 0 ? (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-1 rounded-md px-1 py-2 text-sm font-bold"
                    aria-expanded={isPurchasedOpen}
                    onClick={() => setIsPurchasedOpen((value) => !value)}
                  >
                    <span>購入済み（{purchased.length}件）</span>
                    {isPurchasedOpen ? (
                      <ChevronUp aria-hidden="true" className="size-4" />
                    ) : (
                      <ChevronDown aria-hidden="true" className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 px-1 py-2 text-xs text-muted-foreground underline"
                    disabled={isBulkDeleting}
                    onClick={openBulkDeleteDialog}
                  >
                    購入済みを削除する
                  </button>
                </div>
                {isPurchasedOpen ? (
                  <div className="flex flex-col gap-3">
                    <p className="px-1 text-xs text-muted-foreground">
                      常備食の残数は変わりません。
                    </p>
                    {purchased.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        disabled={pendingItemId === item.id}
                        onToggle={() => handleUnpurchase(item)}
                        onDelete={() => openDeleteDialog(item)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <button
        type="button"
        onClick={openAddSheet}
        aria-label="商品を追加する"
        className="fixed right-5 bottom-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          +
        </span>
      </button>
      <nav className="fixed right-0 bottom-0 left-0 mx-auto flex h-16 max-w-md items-center justify-around border-t bg-card text-xs">
        <Link href="/" className="text-muted-foreground">
          常備食
        </Link>
        <span className="font-bold text-primary">買い物</span>
        <Link href="/stocks/consumed" className="text-muted-foreground">
          消費済
        </Link>
      </nav>

      {isAddSheetOpen ? (
        <div
          className="fixed inset-0 z-20 flex items-end bg-foreground/20"
          role="dialog"
          aria-modal="true"
          aria-label="商品を追加"
        >
          <div className="w-full rounded-t-xl bg-popover p-4">
            <h2 className="mb-3 text-lg font-bold">商品を追加</h2>
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shopping-item-name">商品名</Label>
                <Input
                  id="shopping-item-name"
                  value={itemName}
                  onChange={(event) => handleNameChange(event.target.value)}
                  aria-invalid={nameError ? true : undefined}
                  className="h-12 rounded-lg"
                  autoFocus
                />
                {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
              </div>
              <Button type="submit" disabled={isAdding} className="h-11 w-full rounded-full">
                追加する
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isAdding}
                className="h-11 w-full rounded-full"
                onClick={() => setIsAddSheetOpen(false)}
              >
                キャンセル
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {purchaseSheet ? (
        <div
          className="fixed inset-0 z-20 flex items-end bg-foreground/20"
          role="dialog"
          aria-modal="true"
          aria-label="購入の確認"
        >
          <div className="w-full rounded-t-xl bg-popover p-4">
            <h2 className="mb-3 text-lg font-bold">
              「{purchaseSheet.item.name}」を購入しましたか
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2" role="radiogroup" aria-label="常備食へ戻すか">
                  <Button
                    type="button"
                    variant={purchaseSheet.returnToStock ? "default" : "secondary"}
                    className="h-10 flex-1 rounded-full"
                    role="radio"
                    aria-checked={purchaseSheet.returnToStock}
                    onClick={() =>
                      setPurchaseSheet((current) =>
                        current
                          ? { ...current, returnToStock: true, quantityLimitError: null }
                          : current,
                      )
                    }
                  >
                    常備食へ戻す
                  </Button>
                  <Button
                    type="button"
                    variant={purchaseSheet.returnToStock ? "secondary" : "default"}
                    className="h-10 flex-1 rounded-full"
                    role="radio"
                    aria-checked={!purchaseSheet.returnToStock}
                    onClick={() =>
                      setPurchaseSheet((current) =>
                        current
                          ? { ...current, returnToStock: false, quantityLimitError: null }
                          : current,
                      )
                    }
                  >
                    常備食へ戻さない
                  </Button>
                </div>
              </div>

              {purchaseSheet.returnToStock ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm leading-none font-medium">保存区分</span>
                  <div className="flex gap-2" role="radiogroup" aria-label="保存区分">
                    {storageOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          purchaseSheet.storageType === option.value ? "default" : "secondary"
                        }
                        className="h-10 flex-1 rounded-full"
                        role="radio"
                        aria-checked={purchaseSheet.storageType === option.value}
                        onClick={() =>
                          setPurchaseSheet((current) =>
                            current ? { ...current, storageType: option.value } : current,
                          )
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    元の常備食と同じ保存区分なら残数を1増やし、異なる場合は新しく登録します。元の常備食がない場合や消費済みの場合も新しく登録します。
                  </p>
                  {purchaseSheet.quantityLimitError ? (
                    <p className="text-sm text-destructive">{purchaseSheet.quantityLimitError}</p>
                  ) : null}
                </div>
              ) : null}

              <Button
                type="button"
                disabled={isSubmittingPurchase}
                className="h-11 w-full rounded-full"
                onClick={handleConfirmPurchase}
              >
                購入済みにする
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingPurchase}
                className="h-11 w-full rounded-full"
                onClick={() => setPurchaseSheet(null)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog open={isConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ご家族の誰かが先に変更しました。最新の内容を読み込みます。
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              最新の内容を読み込みます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void handleReloadAfterConflict()}>
              読み込み直す
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{deleteTarget?.name}」を削除しますか</AlertDialogTitle>
            <AlertDialogDescription>
              買い物リストから消えます。常備食には何もしません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteTargets !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBulkDeleteTargets(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>購入済みの商品をすべて削除しますか</AlertDialogTitle>
            <AlertDialogDescription>
              購入済みの商品が買い物リストから消えます。常備食には何もしません。対象：
              {bulkDeleteTargets?.length ?? 0}件
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction disabled={isBulkDeleting} onClick={handleConfirmBulkDelete}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// 商品1件の行。左端にチェック、中央に商品名、右端にゴミ箱を置く
// （10_買い物リスト.md 2節）。押し間違えないよう両端に離す。
function ShoppingItemRow({
  item,
  disabled,
  onToggle,
  onDelete,
}: {
  item: ShoppingItemListItem;
  disabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        disabled={disabled}
        onClick={onToggle}
        aria-label={
          item.isPurchased ? `「${item.name}」を未購入に戻す` : `「${item.name}」を購入済みにする`
        }
      >
        {item.isPurchased ? (
          <CircleCheck aria-hidden="true" className="text-primary" />
        ) : (
          <Circle aria-hidden="true" />
        )}
      </Button>
      <span className="flex-1 text-base">{item.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        disabled={disabled}
        onClick={onDelete}
        aria-label={`「${item.name}」を削除する`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

// 読み込み中にカードと同じ大きさの枠を3つ出す。
function ItemSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-lg border bg-muted" />
      ))}
    </>
  );
}

// 一覧が空または失敗したときに、理由と次の操作を中央に出す。
function EmptyState({
  message,
  buttonLabel,
  onClick,
}: {
  message: string;
  buttonLabel: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="secondary" onClick={onClick}>
        {buttonLabel}
      </Button>
    </div>
  );
}
