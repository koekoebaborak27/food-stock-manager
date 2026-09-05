"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/shared/api/api-error";
import { clientApiFetch } from "@/shared/api/client-fetch";
import { showErrorToast, showSuccessToast } from "@/shared/ui/toast";
import { validateName } from "@/shared/validation/name";
import { updateDisplayNameAction } from "../actions";
import { GENERIC_ERROR_MESSAGE } from "../error-messages";
import { LogoutButton } from "@/modules/auth";

interface AccountSettingsFormProps {
  displayName: string;
}

// 表示名の保存・ログアウト・退会を操作する。
export function AccountSettingsForm({ displayName: initialDisplayName }: AccountSettingsFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 入力済みのときは、文字を変えるたびに入力欄下の文言を更新する。
  function handleChange(value: string): void {
    setDisplayName(value);
    if (touched) {
      setFieldError(validateName(value));
    }
  }

  // 表示名を保存する。成功時だけ完了の帯を出す。
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setTouched(true);
    const error = validateName(displayName);
    setFieldError(error);
    if (error) {
      return;
    }
    startTransition(async () => {
      const result = await updateDisplayNameAction(displayName);
      if (result.ok) {
        showSuccessToast("保存しました");
      } else if (result.code === "VALIDATION_ERROR") {
        setFieldError(result.message);
      } else {
        showErrorToast(result.message);
      }
    });
  }

  // 退会する。ブラウザからAPIを呼び、返るCookie削除をそのまま受け取る。
  function handleWithdraw(): void {
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        await clientApiFetch("/api/users/me", { method: "DELETE" });
        window.location.href = "/login";
      } catch (error) {
        if (error instanceof ApiError && error.code === "HOUSEHOLD_HAS_OTHER_MEMBERS") {
          setBlockedOpen(true);
          return;
        }
        showErrorToast(GENERIC_ERROR_MESSAGE);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">表示名</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            className="h-12 rounded-lg"
          />
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
        </div>
        <Button type="submit" disabled={isPending} className="h-11 w-full rounded-full">
          保存する
        </Button>
      </form>

      <section className="flex flex-col gap-3 border-t pt-6">
        <LogoutButton />
        <Button
          variant="outline"
          className="h-11 w-full rounded-full text-destructive"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
        >
          退会する
        </Button>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アプリから退会しますか</AlertDialogTitle>
            <AlertDialogDescription>
              ログイン情報が削除されます。常備食と買い物リストはご家族に残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleWithdraw}>
              退会する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              管理者は他のメンバーがいる間は退会できません。先に家族グループを削除するか、他のメンバーを除名してください。
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>閉じる</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
