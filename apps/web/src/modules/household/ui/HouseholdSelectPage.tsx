import { Refrigerator } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSession } from "@/modules/auth";

// 家族グループの選択画面。ログイン済みでどの家族グループにも所属していない場合に表示する。
// すでに所属している場合はトップへ戻す
// （docs/specs/02_basic-design/10_認証と家族グループ/11_家族グループの選択.md）。
// ヘッダーのメニューと下部タブは出さない（00_画面共通.md 1節）。
export async function HouseholdSelectPage() {
  const session = await getSession();
  if (session.household) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Refrigerator aria-hidden="true" className="size-10 text-primary" />
        {session.displayName ? <p className="text-lg font-bold">{session.displayName}</p> : null}
        {session.email ? <p className="text-sm text-muted-foreground">{session.email}</p> : null}
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        すでに家族グループを使っている方は、以前と同じGoogleアカウントでログインしてください
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button asChild size="lg" className="h-11 w-full rounded-full">
          <Link href="/household/create">家族グループをつくる</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-11 w-full rounded-full">
          <Link href="/household/join">招待コードで参加する</Link>
        </Button>
      </div>
    </main>
  );
}
