"use client";

import { toast } from "sonner";

// 画面下部の短い帯は3秒で消える（docs/specs/02_basic-design/00_共通/00_画面共通.md 6.1節）。
const TOAST_DURATION_MS = 3000;
// 「元に戻す」を付けた帯だけ5秒表示する(同6.1節)。
const UNDO_TOAST_DURATION_MS = 5000;

export function showErrorToast(message: string): void {
  toast.error(message, { duration: TOAST_DURATION_MS });
}

export function showSuccessToast(message: string): void {
  toast.success(message, { duration: TOAST_DURATION_MS });
}

// 「元に戻す」ボタン付きの帯を5秒表示する（削除直後など）。
export function showUndoToast(message: string, onUndo: () => void): void {
  toast.success(message, {
    duration: UNDO_TOAST_DURATION_MS,
    action: { label: "元に戻す", onClick: onUndo },
  });
}
