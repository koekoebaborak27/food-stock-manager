import { validateName } from "../../shared/validation/name";

// 家族グループの名前を確かめる（docs/specs/02_basic-design/10_認証と家族グループ/12_家族グループをつくる.md）。
// 問題なければnull、問題があれば入力欄の下に出す文言を返す。
export function validateHouseholdName(name: string): string | null {
  return validateName(name);
}

// 招待コードの入力を確かめる。形式チェックはしない
// （docs/specs/02_basic-design/10_認証と家族グループ/13_招待コードで参加する.md）。
export function validateInvitationCode(code: string): string | null {
  if (code.trim().length === 0) {
    return "入力してください";
  }
  return null;
}
