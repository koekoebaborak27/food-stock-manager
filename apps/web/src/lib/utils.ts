import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 複数のクラス名をひとつにまとめる。
 * 条件付きのクラス指定を展開したうえで、同じ役割の Tailwind クラスが重なったときは
 * あとに書いた方だけを残す（例: "p-2" と "p-4" が並んだら "p-4" になる）。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
