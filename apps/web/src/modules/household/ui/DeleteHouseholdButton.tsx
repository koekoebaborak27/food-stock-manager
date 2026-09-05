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
import { deleteHouseholdAction } from "../actions";

// 家族グループの削除ボタン（管理者にだけ表示する。呼び出し元で権限を判定する）。
export function DeleteHouseholdButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(): void {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await deleteHouseholdAction();
      if (!result.ok) {
        showErrorToast(result.message);
      }
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        className="h-11 w-full rounded-full"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        家族グループを削除する
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>家族グループを削除しますか</AlertDialogTitle>
            <AlertDialogDescription>
              常備食・買い物リスト・消費済リストがすべて削除されます。元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
