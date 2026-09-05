"use client";

import { UserX } from "lucide-react";
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
import { removeMemberAction } from "../actions";

interface RemoveMemberButtonProps {
  userId: string;
  displayName: string;
}

// メンバーの除名ボタン（管理者にだけ表示する。呼び出し元で権限を判定する）。
export function RemoveMemberButton({ userId, displayName }: RemoveMemberButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRemove(): void {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await removeMemberAction(userId);
      if (!result.ok) {
        showErrorToast(result.message);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${displayName}を除名する`}
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <UserX aria-hidden="true" className="size-4 text-destructive" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{displayName}」を除名しますか</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName}さんは家族グループから外れます。常備食と買い物リストは残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRemove}>
              除名する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
