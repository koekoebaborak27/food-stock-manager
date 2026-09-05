"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
import { showErrorToast } from "@/shared/ui/toast";
import { redeemInvitationAction } from "../actions";
import { validateInvitationCode } from "../validation";

interface JoinHouseholdFormProps {
  // すでに家族グループに所属している場合は、参加の前に確認ダイアログを出す
  // （docs/specs/02_basic-design/10_認証と家族グループ/13_招待コードで参加する.md）。
  hasHousehold: boolean;
}

// 招待コードで参加する画面。
export function JoinHouseholdForm({ hasHousehold }: JoinHouseholdFormProps) {
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setCode(value);
    if (touched) {
      setFieldError(validateInvitationCode(value));
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await redeemInvitationAction(code);
      if (!result.ok) {
        showErrorToast(result.message);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    const error = validateInvitationCode(code);
    setFieldError(error);
    if (error) {
      return;
    }
    if (hasHousehold) {
      setConfirmOpen(true);
      return;
    }
    submit();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <Link
        href="/household"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        戻る
      </Link>
      <h1 className="text-2xl font-bold">招待コードで参加する</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invitation-code">招待コード</Label>
          <Input
            id="invitation-code"
            value={code}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            className="h-12 rounded-lg"
          />
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
        </div>
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full rounded-full">
          参加する
        </Button>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              今の家族グループを抜けて、新しい家族グループに参加しますか
            </AlertDialogTitle>
            <AlertDialogDescription>
              今の家族グループの常備食・買い物リストは今のご家族に残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                submit();
              }}
            >
              参加する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
