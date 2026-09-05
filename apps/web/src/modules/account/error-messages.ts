// 画面共通の失敗文言。原因を画面で安全に判断できない失敗に使う。
export const GENERIC_ERROR_MESSAGE = "うまくいきませんでした。もう一度お試しください。";

// APIのcodeごとの文言。画面に個別表示する失敗が増えたら、ここへ追加する。
const MESSAGES_BY_CODE: Record<string, string> = {};

// APIのcodeに対応する利用者向け文言を返す。
export function messageForCode(code: string): string {
  return MESSAGES_BY_CODE[code] ?? GENERIC_ERROR_MESSAGE;
}
