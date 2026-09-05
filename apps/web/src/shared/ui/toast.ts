"use client";

import { toast } from "sonner";

// 画面下部の短い帯は3秒で消える（docs/specs/02_basic-design/00_共通/00_画面共通.md 6.1節）。
const TOAST_DURATION_MS = 3000;

export function showErrorToast(message: string): void {
  toast.error(message, { duration: TOAST_DURATION_MS });
}

export function showSuccessToast(message: string): void {
  toast.success(message, { duration: TOAST_DURATION_MS });
}
