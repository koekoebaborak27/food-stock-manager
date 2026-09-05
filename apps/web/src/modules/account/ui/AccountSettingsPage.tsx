import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAccountSettings } from "../service";
import { AccountSettingsForm } from "./AccountSettingsForm";

// アカウント設定画面。本人だけが表示名とメールアドレスを確認・変更できる。
export async function AccountSettingsPage() {
  const account = await getAccountSettings();

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-12">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="戻る" className="text-muted-foreground">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">アカウントの設定</h1>
      </header>
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <Avatar className="size-12">
          {account.avatarUrl ? <AvatarImage src={account.avatarUrl} alt="" /> : null}
          <AvatarFallback>
            <User aria-hidden="true" className="size-5" />
          </AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">{account.email ?? ""}</p>
      </div>
      <AccountSettingsForm displayName={account.displayName ?? ""} />
    </main>
  );
}
