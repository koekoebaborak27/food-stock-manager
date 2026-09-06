import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/modules/push-notification";

// ブラウザのタブや、ホーム画面に追加したときに表示される情報。
// PWAとして端末に保存するのは画面の外枠・アイコン・スタイルまで
// （docs/specs/01_requirements/00_共通/01_プロダクト共通.md）。
export const metadata: Metadata = {
  title: "おうちde常備食",
  description: "家族で作り置きと食品ストックを共有する",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "おうちde常備食",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
      <body>
        {children}
        <Toaster position="bottom-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
