import { Errors } from "../common/errors/app-error";

const MAX_NAME_LENGTH = 20;

// 家族グループの名前を確かめる。未入力・21文字以上はVALIDATION_ERRORとする
// （docs/specs/02_basic-design/10_認証と家族グループ/12_家族グループをつくる.md）。
export function validateHouseholdName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    throw Errors.validation({ field: "name" });
  }
  return trimmed;
}

// 招待コードの入力を確かめる。形式チェックはせず、未入力だけを弾く
// （docs/specs/02_basic-design/10_認証と家族グループ/13_招待コードで参加する.md）。
export function validateInvitationCode(code: unknown): string {
  if (typeof code !== "string" || code.length === 0) {
    throw Errors.validation({ field: "code" });
  }
  return code;
}
