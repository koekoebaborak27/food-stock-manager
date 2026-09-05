"use client";

import {
  Archive,
  CalendarDays,
  Clock3,
  CookingPot,
  Hourglass,
  Menu,
  Refrigerator,
  Search,
  Snowflake,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { showSuccessToast } from "@/shared/ui/toast";
import { consumePendingSaveToast } from "../save-toast";
import {
  buildStockListQuery,
  formatQuantity,
  getExpiryLabel,
  type ExpiryStatus,
} from "../stock-list-helpers";
import type { StockListItem, StockListResponse, StockSort, StorageType } from "../types";

const storageTabs: Array<{ value: StorageType | null; label: string }> = [
  { value: null, label: "すべて" },
  { value: "REFRIGERATED", label: "冷蔵" },
  { value: "FROZEN", label: "冷凍" },
  { value: "ROOM_TEMPERATURE", label: "常温" },
];

const sortOptions: Array<{ value: StockSort; label: string }> = [
  { value: "EXPIRY", label: "期限が近い順" },
  { value: "CREATED", label: "追加順（新しい順）" },
  { value: "NAME", label: "名前順" },
];

// 常備食リスト画面。APIから食品を読み、保存区分・検索・並び替え・期限の絞り込みを行う。
export function StockListPage({ householdName }: { householdName: string }) {
  const [storageType, setStorageType] = useState<StorageType | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<StockSort>("EXPIRY");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [items, setItems] = useState<StockListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // 条件が変わったときだけ一覧を読み直す。開いたまま繰り返し読み込み続けない。
  useEffect(() => {
    void loadStocks();
    // loadStocksは状態を読ませず、ここで指定した条件を引数として受け取る。
  }, [storageType, keyword, sort, urgentOnly]);

  // 登録・編集画面からの保存直後だけ、この画面で結果の帯を出す。
  useEffect(() => {
    const message = consumePendingSaveToast();
    if (message) {
      showSuccessToast(message);
    }
  }, []);

  // APIの成功・失敗を一覧の表示状態へ反映する。
  async function loadStocks(): Promise<void> {
    setIsLoading(true);
    setHasError(false);
    try {
      const query = buildStockListQuery({ storageType, keyword, sort, urgentOnly });
      const response = await clientApiFetch<StockListResponse>(`/api/stocks?${query}`);
      setItems(response.items);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // 絞り込みと検索を初期状態に戻し、全件の一覧を表示する。
  function resetFilters(): void {
    setStorageType(null);
    setKeyword("");
    setUrgentOnly(false);
  }

  const urgentCount = items.filter((item) => item.expiresOn && isUrgent(item.expiresOn)).length;
  const hasFilters = storageType !== null || keyword.trim().length > 0 || urgentOnly;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-32">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <p className="text-sm text-muted-foreground">{householdName}</p>
          <h1 className="text-2xl font-bold">常備食</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={isSearchOpen ? "検索を閉じる" : "検索する"}
            onClick={() => setIsSearchOpen((value) => !value)}
          >
            {isSearchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </Button>
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
        </div>
      </header>

      {isSearchOpen ? (
        <div className="px-4 pb-3">
          <label className="sr-only" htmlFor="stock-search">
            食品名で検索
          </label>
          <input
            id="stock-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="食品名で検索"
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
          />
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto px-4 pb-3" role="tablist" aria-label="保存区分">
        {storageTabs.map((tab) => (
          <Button
            key={tab.label}
            type="button"
            variant={storageType === tab.value ? "default" : "secondary"}
            className="h-10 shrink-0 rounded-full"
            role="tab"
            aria-selected={storageType === tab.value}
            onClick={() => setStorageType(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {urgentOnly ? (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm">
          <span>期限が近い食品だけ表示中</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrgentOnly(false)}>
            解除
          </Button>
        </div>
      ) : urgentCount > 0 ? (
        <button
          type="button"
          onClick={() => setUrgentOnly(true)}
          className="mx-4 mb-3 rounded-lg bg-accent px-3 py-2 text-left text-sm"
        >
          期限が近い食品が{urgentCount}件あります
        </button>
      ) : null}

      <div className="flex justify-end px-4 pb-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsSortOpen(true)}>
          {sortOptions.find((option) => option.value === sort)?.label}
        </Button>
      </div>

      <section className="flex flex-1 flex-col gap-3 px-4" aria-live="polite">
        {isLoading ? <StockSkeleton /> : null}
        {!isLoading && hasError ? (
          <EmptyState
            message="読み込めませんでした。通信の状態を確かめて、もう一度お試しください。"
            buttonLabel="もう一度読み込む"
            onClick={() => void loadStocks()}
          />
        ) : null}
        {!isLoading && !hasError && items.length > 0
          ? items.map((item) => <StockCard key={item.id} item={item} />)
          : null}
        {!isLoading && !hasError && items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              message="見つかりませんでした。"
              buttonLabel="絞り込みを外す"
              onClick={resetFilters}
            />
          ) : (
            <EmptyState
              message="まだ登録がありません。右下のボタンから食品を追加してください。"
              buttonLabel="食品を追加する"
            />
          )
        ) : null}
      </section>

      <Link
        href="/stocks/new"
        aria-label="食品を追加する"
        className="fixed right-5 bottom-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          +
        </span>
      </Link>
      <nav className="fixed right-0 bottom-0 left-0 mx-auto flex h-16 max-w-md items-center justify-around border-t bg-card text-xs">
        <span className="font-bold text-primary">常備食</span>
        <span className="text-muted-foreground">買い物</span>
        <span className="text-muted-foreground">消費済</span>
      </nav>

      {isSortOpen ? (
        <div
          className="fixed inset-0 z-20 flex items-end bg-foreground/20"
          role="dialog"
          aria-modal="true"
          aria-label="並び替え"
        >
          <div className="w-full rounded-t-xl bg-popover p-4">
            <h2 className="mb-3 text-lg font-bold">並び替え</h2>
            <div className="flex flex-col gap-1">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setSort(option.value);
                    setIsSortOpen(false);
                  }}
                >
                  {option.label}
                </Button>
              ))}
              <Button type="button" variant="secondary" onClick={() => setIsSortOpen(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

// 食品1件をカードで表示する。期限・保存区分・作り置きは文字とアイコンの両方で示す。
function StockCard({ item }: { item: StockListItem }) {
  const expiry = item.expiresOn ? getExpiryLabel(item.expiresOn) : null;
  return (
    <article className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-bold">{item.name}</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <StorageTag storageType={item.storageType} />
        <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
          残り {formatQuantity(item.quantity, item.unit)}
        </span>
        {expiry ? <ExpiryTag status={expiry.status} label={expiry.label} /> : null}
        {item.isHomemade ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
            <CookingPot aria-hidden="true" className="size-3" />
            作り置き
          </span>
        ) : null}
      </div>
    </article>
  );
}

// 保存区分を文字と線画のアイコンで表す。
function StorageTag({ storageType }: { storageType: StorageType }) {
  const values = {
    REFRIGERATED: { label: "冷蔵", Icon: Refrigerator },
    FROZEN: { label: "冷凍", Icon: Snowflake },
    ROOM_TEMPERATURE: { label: "常温", Icon: Archive },
  } as const;
  const { label, Icon } = values[storageType];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

// 期限の状態を文言とアイコンと専用トークンで表す。
function ExpiryTag({ status, label }: { status: ExpiryStatus; label: string }) {
  const values = {
    EXPIRED: { Icon: Clock3, className: "bg-expiry-expired text-expiry-expired-foreground" },
    TODAY: { Icon: Clock3, className: "bg-expiry-today text-expiry-today-foreground" },
    TOMORROW: { Icon: Clock3, className: "bg-expiry-today text-expiry-today-foreground" },
    SOON: { Icon: Hourglass, className: "bg-expiry-soon text-expiry-soon-foreground" },
    NORMAL: { Icon: CalendarDays, className: "bg-expiry-normal text-expiry-normal-foreground" },
  } as const;
  const { Icon, className } = values[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${className}`}>
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

// 読み込み中にカードと同じ大きさの枠を3つ出す。
function StockSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-lg border bg-muted" />
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
      {onClick ? (
        <Button type="button" variant="secondary" onClick={onClick}>
          {buttonLabel}
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">{buttonLabel}</span>
      )}
    </div>
  );
}

// 期限が今日・明日・期限切れかを、期限タグの状態を使って確認する。
function isUrgent(expiresOn: string): boolean {
  const status = getExpiryLabel(expiresOn).status;
  return status === "EXPIRED" || status === "TODAY" || status === "TOMORROW";
}
