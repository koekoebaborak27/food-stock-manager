// 03_共通文言.md 2節の既定文言。原因のわからない失敗はこれで受ける。
export const GENERIC_ERROR_MESSAGE = "うまくいきませんでした。もう一度お試しください。";

// この機能だけのcodeに対する文言（docs/specs/02_basic-design/10_認証と家族グループ配下の各画面）。
// 一覧に無いcode（LAST_ADMIN_CANNOT_BE_REMOVED等、通常は画面から呼べない分岐）は
// 既定文言にフォールバックする。
const MESSAGES_BY_CODE: Record<string, string> = {
  INVITATION_NOT_FOUND: "招待コードが見つかりません。コードを確かめてください。",
  INVITATION_EXPIRED: "この招待コードの有効期限が切れています。家族に再発行を頼んでください。",
};

export function messageForCode(code: string): string {
  return MESSAGES_BY_CODE[code] ?? GENERIC_ERROR_MESSAGE;
}
