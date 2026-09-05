import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/modules/auth";
import { getMyHousehold } from "../service";
import { DeleteHouseholdButton } from "./DeleteHouseholdButton";
import { LeaveButton } from "./LeaveButton";
import { RemoveMemberButton } from "./RemoveMemberButton";

// メンバーと家族グループ画面。ヘッダーのメニューから開く
// （docs/specs/02_basic-design/10_認証と家族グループ/14_メンバーと家族グループ.md）。
// グローバルなヘッダーメニュー・下部タブは未実装のため、戻るボタンだけの簡易ヘッダーで代替する。
export async function HouseholdMembersPage() {
  const [household, session] = await Promise.all([getMyHousehold(), getSession()]);
  const isAdmin = session.household?.role === "ADMIN";

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-12">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="戻る" className="text-muted-foreground">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">メンバーと家族グループ</h1>
      </header>

      <section className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">家族グループ名</p>
        <p className="text-lg font-bold">{household.name}</p>
      </section>

      <section className="flex flex-col gap-3">
        {household.members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-3 rounded-lg border bg-card p-4"
          >
            <Avatar>
              {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
              <AvatarFallback>
                <User aria-hidden="true" className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 items-center gap-2">
              <span className="font-bold">{member.displayName ?? "退会したメンバー"}</span>
              {member.role === "ADMIN" ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  管理者
                </span>
              ) : null}
            </div>
            {isAdmin && member.userId !== session.userId ? (
              <RemoveMemberButton
                userId={member.userId}
                displayName={member.displayName ?? "このメンバー"}
              />
            ) : null}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Button asChild variant="secondary" className="h-11 w-full rounded-full">
          <Link href="/household/members/invite">招待コードを発行する</Link>
        </Button>
        <LeaveButton />
        {isAdmin ? <DeleteHouseholdButton /> : null}
      </section>
    </main>
  );
}
