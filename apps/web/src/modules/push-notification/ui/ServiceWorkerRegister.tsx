"use client";

import { useEffect } from "react";

// アプリ起動時にService Workerを登録しておく（プッシュ通知の土台）。
// 通知を有効にする操作でも改めて登録を試みるため、ここでの失敗は無視してよい
// （対応していない端末では単にプッシュ通知が使えないだけで、他の画面表示には影響しない）。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
