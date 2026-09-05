import { Refrigerator } from "lucide-react";

import { Button } from "@/components/ui/button";

// ログイン画面。アプリ名・説明・「Googleでログインする」だけを持つ
// （docs/specs/02_basic-design/10_認証と家族グループ/10_ログイン.md）。
// 通常のリンク遷移でバックエンドの認可入口へ移す（fetchではなく<a>にする）。
export function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center p-6">
      {/*
        背景の写真。中身を伝える情報を持たない飾りのため、alt は空にして読み上げから外す。
        768px未満はスマホ用の縦長写真、768px以上はPC用の横長写真に出し分ける。
      */}
      <picture aria-hidden="true" className="absolute inset-0 block">
        <source media="(min-width: 768px)" srcSet="/images/login-background-pc.webp" />
        <img
          src="/images/login-background-mobile.webp"
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </picture>

      {/* 写真の上に重ねる、濃いブラウンの角丸パネル。文字とのコントラストを保つため単色で不透明にする */}
      <div className="relative w-full max-w-sm rounded-3xl bg-foreground px-8 py-10 text-center text-background">
        <Refrigerator aria-hidden="true" className="mx-auto size-12" />
        <h1 className="mt-4 text-2xl font-bold">おうちde常備食</h1>
        <p className="mt-2 text-base">
          家族で常備食と買い物リストを
          <br />
          共有します
        </p>
        <Button asChild size="lg" className="mt-6 h-11 w-full rounded-full">
          <a href="/api/auth/google">Googleでログインする</a>
        </Button>
      </div>
    </main>
  );
}
