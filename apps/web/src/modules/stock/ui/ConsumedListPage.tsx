"use client";

import { Archive, Menu, Refrigerator, RotateCcw, Snowflake } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { formatDateFromDateTime } from "@/shared/format/date";
import { showErrorToast } from "@/shared/ui/toast";
import { messageForCode } from "../error-messages";
import { unitLabel } from "../stock-list-helpers";
import type {
  ConsumedStockItem,
  ConsumedStockListResponse,
  StockDetail,
  StorageType,
} from "../types";

const storageLabels: Record<StorageType, { label: string; Icon: typeof Refrigerator }> = {
  REFRIGERATED: { label: "冷蔵", Icon: Refrigerator },
  FROZEN: { label: "冷凍", Icon: Snowflake },
  ROOM_TEMPERATURE: { label: "常温", Icon: Archive },
};

// 消費済リスト画面。下部タブから開き、消費済にした日付の新しい順に並べる
// （docs/specs/02_basic-design/20_常備食管理/13_消費済リスト.md）。
// 買い物リストへの追加は30_買い物リストの実装後に別途対応する。
export function ConsumedListPage({ householdName }: { householdName: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ConsumedStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reRegisteringId, setReRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    void loadConsumed();
  }, []);

  // APIの成功・失敗を一覧の表示状態へ反映する。
  async function loadConsumed(): Promise<void> {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await clientApiFetch<ConsumedStockListResponse>("/api/stocks/consumed");
      setItems(response.items);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // 消費済食品を、食品名・保存区分・単位を引き継いだ新しい常備食として作り、
  // その常備食の編集画面を開く。
  function handleReRegister(id: string): void {
    setReRegisteringId(id);
    void (async () => {
      try {
        const created = await clientApiFetch<StockDetail>(`/api/stocks/${id}/re-register`, {
          method: "POST",
        });
        router.push(`/stocks/${created.id}/edit`);
      } catch (error) {
        showErrorToast(messageForCode(error instanceof ApiError ? error.code : "SERVER_ERROR"));
        setReRegisteringId(null);
      }
    })();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-32">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <p className="text-sm text-muted-foreground">{householdName}</p>
          <h1 className="text-2xl font-bold">消費済</h1>
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
        {isLoading ? <ConsumedSkeleton /> : null}
        {!isLoading && hasError ? (
          <EmptyState
            message="読み込めませんでした。通信の状態を確かめて、もう一度お試しください。"
            buttonLabel="もう一度読み込む"
            onClick={() => void loadConsumed()}
          />
        ) : null}
        {!isLoading && !hasError && items.length > 0
          ? items.map((item) => (
              <ConsumedCard
                key={item.id}
                item={item}
                isPending={reRegisteringId === item.id}
                onReRegister={() => handleReRegister(item.id)}
              />
            ))
          : null}
        {!isLoading && !hasError && items.length === 0 ? (
          <EmptyState message="食べ終えた食品がここに並びます。" />
        ) : null}
      </section>

      <nav className="fixed right-0 bottom-0 left-0 mx-auto flex h-16 max-w-md items-center justify-around border-t bg-card text-xs">
        <Link href="/" className="text-muted-foreground">
          常備食
        </Link>
        <Link href="/shopping-list" className="text-muted-foreground">
          買い物
        </Link>
        <span className="font-bold text-primary">消費済</span>
      </nav>
    </main>
  );
}

// 消費済食品1件をカードで表示する。削除の操作は置かず、常備食へ戻すことだけ並べる
// （13_消費済リスト.md 2節）。
function ConsumedCard({
  item,
  isPending,
  onReRegister,
}: {
  item: ConsumedStockItem;
  isPending: boolean;
  onReRegister: () => void;
}) {
  const storage = storageLabels[item.storageType];
  const unit = unitLabel(item.unit);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-bold">{item.name}</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
          <storage.Icon aria-hidden="true" className="size-3" />
          {storage.label}
        </span>
        {unit ? (
          <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
            {unit}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDateFromDateTime(item.consumedAt)}に消費済
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 rounded-full"
        disabled={isPending}
        onClick={onReRegister}
      >
        <RotateCcw aria-hidden="true" className="size-3" />
        常備食へ戻す
      </Button>
    </div>
  );
}

// 読み込み中にカードと同じ大きさの枠を3つ出す。
function ConsumedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-lg border bg-muted" />
      ))}
    </>
  );
}

// 一覧が空または失敗したときに、理由と次の操作を中央に出す。ボタンがない場合は出さない。
function EmptyState({
  message,
  buttonLabel,
  onClick,
}: {
  message: string;
  buttonLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {buttonLabel ? (
        <Button type="button" variant="secondary" onClick={onClick}>
          {buttonLabel}
        </Button>
      ) : null}
    </div>
  );
}
