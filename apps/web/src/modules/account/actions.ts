"use server";

import { ApiError } from "@/shared/api/api-error";
import { serverApiFetch } from "@/shared/api/server-fetch";
import { validateName } from "@/shared/validation/name";
import { messageForCode } from "./error-messages";
import type { ActionResult } from "./types";

// 表示名を更新する。入力エラーは画面でそのまま表示できる文言に変換する。
export async function updateDisplayNameAction(displayName: string): Promise<ActionResult> {
  const validationError = validateName(displayName);
  if (validationError) {
    return { ok: false, code: "VALIDATION_ERROR", message: validationError };
  }

  try {
    await serverApiFetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: messageForCode(error.code) };
    }
    throw error;
  }
  return { ok: true };
}
