"use client";

// 登録・編集画面の保存は常備食リスト画面へ移ってから帯を出す
// （docs/specs/02_basic-design/00_共通/03_共通文言.md 7）。画面をまたぐため、
// 移る前にsessionStorageへ文言を置き、リスト画面が開いたときに読み出して消す。
const STORAGE_KEY = "stock-save-toast";

export function setPendingSaveToast(message: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    // 使えない場合は帯を諦める。保存自体は成功しているため処理は止めない。
  }
}

export function consumePendingSaveToast(): string | null {
  try {
    const message = sessionStorage.getItem(STORAGE_KEY);
    if (message !== null) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return message;
  } catch {
    return null;
  }
}
