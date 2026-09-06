"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { NotificationGuidanceReason } from "../types";

const GUIDANCE: Record<NotificationGuidanceReason, { title: string; description: string }> = {
  UNSUPPORTED: {
    title: "通知を利用できません",
    description: "この端末では通知の機能を利用できません。",
  },
  IOS_NOT_INSTALLED: {
    title: "ホーム画面に追加してください",
    description:
      "iPhoneでは、ホーム画面に追加してから通知を受け取れます。共有メニューの「ホーム画面に追加」から追加してください。",
  },
  PERMISSION_DENIED: {
    title: "通知が許可されていません",
    description: "端末の設定アプリから、このアプリの通知を許可してから、もう一度お試しください。",
  },
};

interface NotificationGuidanceDialogProps {
  reason: NotificationGuidanceReason | null;
  onOpenChange: (open: boolean) => void;
}

// 通知を有効にできないときの案内。取り消せる操作の確認ではないため、
// 確認ダイアログではなく閉じるボタンだけを出す
// （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 2〜3節）。
export function NotificationGuidanceDialog({
  reason,
  onOpenChange,
}: NotificationGuidanceDialogProps) {
  const content = reason ? GUIDANCE[reason] : null;

  return (
    <AlertDialog open={content !== null} onOpenChange={onOpenChange}>
      {content && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.title}</AlertDialogTitle>
            <AlertDialogDescription>{content.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>閉じる</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
