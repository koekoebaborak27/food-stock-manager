"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast } from "@/shared/ui/toast";
import { createHouseholdAction } from "../actions";
import { validateHouseholdName } from "../validation";

// 家族グループをつくる画面（docs/specs/02_basic-design/10_認証と家族グループ/12_家族グループをつくる.md）。
// ヘッダーのメニューと下部タブは出さない（00_画面共通.md 1節）。
export function CreateHouseholdForm() {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setName(value);
    if (touched) {
      setFieldError(validateHouseholdName(value));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    const error = validateHouseholdName(name);
    setFieldError(error);
    if (error) {
      return;
    }
    startTransition(async () => {
      const result = await createHouseholdAction(name);
      if (!result.ok) {
        showErrorToast(result.message);
      }
    });
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
      <h1 className="text-2xl font-bold">家族グループをつくる</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="household-name">家族グループの名前</Label>
          <Input
            id="household-name"
            value={name}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            className="h-12 rounded-lg"
          />
          {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
        </div>
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full rounded-full">
          作成する
        </Button>
      </form>
    </main>
  );
}
