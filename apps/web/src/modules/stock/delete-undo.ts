"use client";

// 詳細画面からの削除は常備食リスト画面へ移ってから「元に戻す」付きの帯を出す
// （docs/specs/02_basic-design/00_共通/03_共通文言.md 7）。画面をまたぐため、
// 移る前にsessionStorageへ削除した食品のidと文言・期限を置き、
// リスト画面が開いたときに読み出して消す。5秒を過ぎていたら「元に戻す」を出さない
// （docs/specs/02_basic-design/20_常備食管理/00_常備食管理共通.md 5節）。
const STORAGE_KEY = "stock-delete-undo";
const UNDO_WINDOW_MS = 5000;

interface PendingDeleteUndo {
  id: string;
  message: string;
  expiresAt: number;
}

export function setPendingDeleteUndo(id: string, name: string): void {
  const value: PendingDeleteUndo = {
    id,
    message: `「${name}」を削除しました`,
    expiresAt: Date.now() + UNDO_WINDOW_MS,
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 使えない場合は「元に戻す」を諦める。削除自体は成功しているため処理は止めない。
  }
}

// 保存されていて、かつ5秒以内であればそのまま返す。読み出したら必ず消す。
export function consumePendingDeleteUndo(): PendingDeleteUndo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    const value = JSON.parse(raw) as PendingDeleteUndo;
    return value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}
