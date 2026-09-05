"use client";

import { ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/shared/format/date";
import { showErrorToast, showSuccessToast } from "@/shared/ui/toast";
import { issueInvitationAction } from "../actions";
import type { InvitationView } from "../types";

// 招待コードの発行画面。開くたびに「発行する」を押させ、有効なコードがあれば
// そのコードがそのまま返る（docs/specs/02_basic-design/10_認証と家族グループ/15_招待コードの発行.md）。
export function InvitationIssuePage() {
  const [invitation, setInvitation] = useState<InvitationView | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleIssue(): void {
    startTransition(async () => {
      const result = await issueInvitationAction();
      if (result.ok) {
        setInvitation(result.invitation);
      } else {
        showErrorToast(result.message);
      }
    });
  }

  async function handleCopy(): Promise<void> {
    if (!invitation) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invitation.code);
      showSuccessToast("コピーしました");
    } catch {
      showErrorToast("うまくいきませんでした。もう一度お試しください。");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <Link href="/household/members" aria-label="戻る" className="text-muted-foreground">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">招待コードの発行</h1>
      </header>

      {invitation ? (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
          <div>
            <p className="text-sm text-muted-foreground">招待コード</p>
            <p className="break-all text-lg font-bold">{invitation.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">有効期限</p>
            <p className="text-base">{formatDateTime(invitation.expiresAt)}</p>
          </div>
          <Button variant="secondary" className="h-11 w-full rounded-full" onClick={handleCopy}>
            <Copy aria-hidden="true" className="size-4" />
            コピーする
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          disabled={isPending}
          className="h-11 w-full rounded-full"
          onClick={handleIssue}
        >
          招待コードを発行する
        </Button>
      )}
    </main>
  );
}
