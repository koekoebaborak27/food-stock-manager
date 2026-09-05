"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/shared/ui/toast";
import { leaveHouseholdAction } from "../actions";

// 自分自身の脱退ボタン。管理者が他のメンバーを残したまま脱退しようとした場合は、
// 確認ダイアログの代わりに閉じるだけのダイアログを出す
// （docs/specs/02_basic-design/10_認証と家族グループ/14_メンバーと家族グループ.md 3節）。
export function LeaveButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLeave(): void {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await leaveHouseholdAction();
      if (!result.ok) {
        if (result.code === "HOUSEHOLD_HAS_OTHER_MEMBERS") {
          setBlockedOpen(true);
        } else {
          showErrorToast(result.message);
        }
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 w-full rounded-full"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        家族グループを脱退する
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>家族グループを脱退しますか</AlertDialogTitle>
            <AlertDialogDescription>
              常備食と買い物リストはご家族に残ります。もう一度参加するには招待コードが必要です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLeave}>
              脱退する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              管理者は他のメンバーがいる間は脱退できません。先に家族グループを削除するか、他のメンバーを除名してください。
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>閉じる</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
