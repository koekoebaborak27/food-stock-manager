import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

// ブラウザのタブや、ホーム画面に追加したときに表示される情報。
export const metadata: Metadata = {
  title: "おうちde常備食",
  description: "家族で作り置きと食品ストックを共有する",
};

// スマートフォンでの表示幅の指定。画面の横幅に合わせて等倍で表示する。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 端末がダーク設定でもライトで表示する。暖色の配色を明るい地の上で成立させているため。
  colorScheme: "light",
  themeColor: "#fdf8f1",
};

// すべての画面を包む一番外側の枠。ページごとの中身は children に入って渡される。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
