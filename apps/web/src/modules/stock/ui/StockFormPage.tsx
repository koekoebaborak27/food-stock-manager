"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { showErrorToast } from "@/shared/ui/toast";
import { messageForCode } from "../error-messages";
import { setPendingSaveToast } from "../save-toast";
import type { StockDetail, StockInput, StorageType, UnitType } from "../types";
import { validateMemo, validateQuantityInput, validateStockName } from "../validation";

const storageOptions: Array<{ value: StorageType; label: string }> = [
  { value: "REFRIGERATED", label: "冷蔵" },
  { value: "FROZEN", label: "冷凍" },
  { value: "ROOM_TEMPERATURE", label: "常温" },
];

const unitOptions: Array<{ value: UnitType | null; label: string }> = [
  { value: null, label: "未選択" },
  { value: "PIECE", label: "個" },
  { value: "BAG", label: "袋" },
  { value: "PACK", label: "パック" },
  { value: "SERVING", label: "食分" },
  { value: "BOTTLE", label: "本" },
  { value: "GOTO", label: "ごと" },
];

interface FieldErrors {
  name: string | null;
  quantity: string | null;
  memo: string | null;
}

const NO_FIELD_ERRORS: FieldErrors = { name: null, quantity: null, memo: null };

interface StockFormPageProps {
  mode: "create" | "edit";
  stock?: StockDetail;
}

// 常備食の登録・編集画面。同じ画面をmodeで出し分ける
// （docs/specs/02_basic-design/20_常備食管理/11_常備食の登録編集.md）。
export function StockFormPage({ mode, stock }: StockFormPageProps) {
  const router = useRouter();
  const [name, setName] = useState(stock?.name ?? "");
  const [storageType, setStorageType] = useState<StorageType>(stock?.storageType ?? "REFRIGERATED");
  const [quantity, setQuantity] = useState(String(stock?.quantity ?? 1));
  const [unit, setUnit] = useState<UnitType | null>(stock?.unit ?? null);
  const [expiresOn, setExpiresOn] = useState(stock?.expiresOn ?? "");
  const [isHomemade, setIsHomemade] = useState(stock?.isHomemade ?? false);
  const [memo, setMemo] = useState(stock?.memo ?? "");
  const [updatedAt, setUpdatedAt] = useState(stock?.updatedAt ?? "");
  const [touched, setTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(NO_FIELD_ERRORS);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function validateAll(): boolean {
    const errors: FieldErrors = {
      name: validateStockName(name),
      quantity: validateQuantityInput(quantity),
      memo: validateMemo(memo),
    };
    setFieldErrors(errors);
    return !errors.name && !errors.quantity && !errors.memo;
  }

  function handleNameChange(value: string): void {
    setName(value);
    if (touched) {
      setFieldErrors((current) => ({ ...current, name: validateStockName(value) }));
    }
  }

  function handleQuantityChange(value: string): void {
    setQuantity(value);
    if (touched) {
      setFieldErrors((current) => ({ ...current, quantity: validateQuantityInput(value) }));
    }
  }

  function handleMemoChange(value: string): void {
    setMemo(value);
    if (touched) {
      setFieldErrors((current) => ({ ...current, memo: validateMemo(value) }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setTouched(true);
    if (!validateAll()) {
      return;
    }

    const input: StockInput = {
      name: name.trim(),
      storageType,
      quantity: Number(quantity),
      unit,
      expiresOn: expiresOn || null,
      isHomemade,
      memo: memo.trim() || null,
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          const created = await clientApiFetch<StockDetail & { duplicateName: boolean }>(
            "/api/stocks",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            },
          );
          setPendingSaveToast(
            created.duplicateName ? "保存しました(同じ名前の食品がすでにあります)" : "保存しました",
          );
        } else if (stock) {
          await clientApiFetch<StockDetail>(`/api/stocks/${stock.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, updatedAt }),
          });
          setPendingSaveToast("保存しました");
        }
        router.push("/");
      } catch (error) {
        if (error instanceof ApiError && error.code === "STOCK_UPDATE_CONFLICT") {
          setConflictOpen(true);
          return;
        }
        showErrorToast(messageForCode(error instanceof ApiError ? error.code : "SERVER_ERROR"));
      }
    });
  }

  // 競合ダイアログの「読み込み直す」。最新の内容を読み直し、更新日時も差し替える。
  async function handleReload(): Promise<void> {
    if (!stock) {
      return;
    }
    try {
      const latest = await clientApiFetch<StockDetail>(`/api/stocks/${stock.id}`);
      setName(latest.name);
      setStorageType(latest.storageType);
      setQuantity(String(latest.quantity));
      setUnit(latest.unit);
      setExpiresOn(latest.expiresOn ?? "");
      setIsHomemade(latest.isHomemade);
      setMemo(latest.memo ?? "");
      setUpdatedAt(latest.updatedAt);
      setFieldErrors(NO_FIELD_ERRORS);
      setTouched(false);
    } catch (error) {
      showErrorToast(messageForCode(error instanceof ApiError ? error.code : "SERVER_ERROR"));
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
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "常備食を登録" : "常備食を編集"}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stock-name">食品名</Label>
          <Input
            id="stock-name"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            aria-invalid={fieldErrors.name ? true : undefined}
            className="h-12 rounded-lg"
          />
          {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">保存区分</span>
          <div className="flex gap-2" role="radiogroup" aria-label="保存区分">
            {storageOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={storageType === option.value ? "default" : "secondary"}
                className="h-10 rounded-full"
                role="radio"
                aria-checked={storageType === option.value}
                onClick={() => setStorageType(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="stock-quantity">残数</Label>
          <Input
            id="stock-quantity"
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={quantity}
            onChange={(event) => handleQuantityChange(event.target.value)}
            aria-invalid={fieldErrors.quantity ? true : undefined}
            className="h-12 w-24 rounded-lg"
          />
          {fieldErrors.quantity ? (
            <p className="text-sm text-destructive">{fieldErrors.quantity}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">単位</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="単位">
            {unitOptions.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant={unit === option.value ? "default" : "secondary"}
                className="h-10 rounded-full"
                role="radio"
                aria-checked={unit === option.value}
                onClick={() => setUnit(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="stock-expires-on">期限</Label>
          <Input
            id="stock-expires-on"
            type="date"
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
            className="h-12 rounded-lg"
          />
        </div>

        <label className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            checked={isHomemade}
            onChange={(event) => setIsHomemade(event.target.checked)}
            className="size-5 rounded border-input"
          />
          <span className="text-base">作り置き</span>
        </label>

        <div className="flex flex-col gap-2">
          <Label htmlFor="stock-memo">メモ</Label>
          <textarea
            id="stock-memo"
            value={memo}
            onChange={(event) => handleMemoChange(event.target.value)}
            aria-invalid={fieldErrors.memo ? true : undefined}
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none aria-invalid:border-destructive"
          />
          {fieldErrors.memo ? <p className="text-sm text-destructive">{fieldErrors.memo}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={isPending} className="h-11 w-full rounded-full">
            保存する
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            className="h-11 w-full rounded-full"
            onClick={() => router.push("/")}
          >
            キャンセル
          </Button>
        </div>
      </form>

      <AlertDialog open={conflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ご家族の誰かが先に変更しました。最新の内容を読み込みます。
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              保存できませんでした。最新の内容を読み込み直してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void handleReload()}>読み込み直す</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
