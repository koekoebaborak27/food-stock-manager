"use client";

import { ChevronDown, ChevronUp, Circle, CircleCheck, Menu, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { showErrorToast, showSuccessToast } from "@/shared/ui/toast";
import { messageForCode } from "../error-messages";
import type { ShoppingItemListItem, ShoppingItemListResponse } from "../types";
import { validateShoppingItemName } from "../validation";

// 商品名の直下にエラーを出す失敗（10_買い物リスト.md 7節）。それ以外は帯で伝える。
const INLINE_NAME_ERROR_CODES = new Set([
  "SHOPPING_ITEM_NAME_REQUIRED",
  "SHOPPING_ITEM_NAME_TOO_LONG",
  "SHOPPING_ITEM_ALREADY_EXISTS",
]);

// 買い物リスト画面。下部タブから開き、未購入・購入済みに分けて商品を表示する
// （docs/specs/02_basic-design/30_買い物リスト/10_買い物リスト.md）。
// 購入状態の変更・削除は後続タスク（7e-4・7e-5）で扱うため、チェック・ゴミ箱は
// 表示だけしてdisabledにしておく。
export function ShoppingListPage({ householdName }: { householdName: string }) {
  const [items, setItems] = useState<ShoppingItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPurchasedOpen, setIsPurchasedOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

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
              unpurchased.map((item) => <ShoppingItemRow key={item.id} item={item} />)
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                未購入の商品はありません。
              </p>
            )}

            {purchased.length > 0 ? (
              <div className="mt-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-bold"
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
                {isPurchasedOpen ? (
                  <div className="flex flex-col gap-3">
                    {purchased.map((item) => (
                      <ShoppingItemRow key={item.id} item={item} />
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
    </main>
  );
}

// 商品1件の行。左端にチェック、中央に商品名、右端にゴミ箱を置く
// （10_買い物リスト.md 2節）。押し間違えないよう両端に離す。
// チェック・ゴミ箱の操作は7e-4・7e-5で有効にするため、ここではdisabledにする。
function ShoppingItemRow({ item }: { item: ShoppingItemListItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        disabled
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
        disabled
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
