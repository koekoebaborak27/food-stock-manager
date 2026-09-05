"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/shared/api/api-error";
import { serverApiFetch } from "@/shared/api/server-fetch";
import { messageForCode } from "./error-messages";
import type { ActionResult, InvitationView, IssueInvitationResult } from "./types";
import { validateHouseholdName, validateInvitationCode } from "./validation";

// バックエンド呼び出しをActionResultへ変換する。ApiError以外は入口ラッパーへ素通しする。
async function runMutation(run: () => Promise<void>): Promise<ActionResult> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: messageForCode(error.code) };
    }
    throw error;
  }
  return { ok: true };
}

// 家族グループをつくる。呼んだ利用者を管理者として登録する。
// 常備食リストは未実装のため、作成後はいまはトップへ戻す。
export async function createHouseholdAction(name: string): Promise<ActionResult> {
  const validationError = validateHouseholdName(name);
  if (validationError) {
    return { ok: false, code: "VALIDATION_ERROR", message: validationError };
  }
  const result = await runMutation(() =>
    serverApiFetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }),
  );
  if (result.ok) {
    redirect("/");
  }
  return result;
}

// 招待コードで参加する。すでに家族グループに属している場合は、
// 呼ぶ前に画面側で確認ダイアログを出す（modules/household/ui/JoinHouseholdForm.tsx）。
export async function redeemInvitationAction(code: string): Promise<ActionResult> {
  const validationError = validateInvitationCode(code);
  if (validationError) {
    return { ok: false, code: "VALIDATION_ERROR", message: validationError };
  }
  const result = await runMutation(() =>
    serverApiFetch("/api/invitations/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    }),
  );
  if (result.ok) {
    redirect("/");
  }
  return result;
}

// 自分自身が家族グループを脱退する。
export async function leaveHouseholdAction(): Promise<ActionResult> {
  const result = await runMutation(() =>
    serverApiFetch("/api/households/me/membership", { method: "DELETE" }),
  );
  if (result.ok) {
    redirect("/household");
  }
  return result;
}

// メンバーを除名する（管理者だけ）。
export async function removeMemberAction(userId: string): Promise<ActionResult> {
  const result = await runMutation(() =>
    serverApiFetch(`/api/households/me/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  );
  if (result.ok) {
    revalidatePath("/household/members");
  }
  return result;
}

// 家族グループを削除する（管理者だけ）。
export async function deleteHouseholdAction(): Promise<ActionResult> {
  const result = await runMutation(() =>
    serverApiFetch("/api/households/me", { method: "DELETE" }),
  );
  if (result.ok) {
    redirect("/household");
  }
  return result;
}

// 招待コードを発行・再表示する。
export async function issueInvitationAction(): Promise<IssueInvitationResult> {
  try {
    const invitation = await serverApiFetch<InvitationView>("/api/invitations", {
      method: "POST",
    });
    return { ok: true, invitation };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: messageForCode(error.code) };
    }
    throw error;
  }
}
