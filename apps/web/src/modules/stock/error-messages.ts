// 画面共通の失敗文言。原因を画面で安全に判断できない失敗に使う。
export const GENERIC_ERROR_MESSAGE = "うまくいきませんでした。もう一度お試しください。";

// APIのcodeごとの文言（docs/specs/02_basic-design/00_共通/03_共通文言.md 2・3、
// 30_買い物リスト/10_買い物リスト.md 7節。買い物リストへの追加を伴う操作で使う）。
const MESSAGES_BY_CODE: Record<string, string> = {
  STOCK_NOT_FOUND: "このデータは見つかりませんでした。ご家族の誰かが削除した可能性があります。",
  SHOPPING_ITEM_NOT_FOUND:
    "このデータは見つかりませんでした。ご家族の誰かが削除した可能性があります。",
  SOURCE_STOCK_NOT_FOUND:
    "このデータは見つかりませんでした。ご家族の誰かが削除した可能性があります。",
  SHOPPING_ITEM_ALREADY_EXISTS: "この商品はすでにリストにあります。",
};

// APIのcodeに対応する利用者向け文言を返す。
export function messageForCode(code: string): string {
  return MESSAGES_BY_CODE[code] ?? GENERIC_ERROR_MESSAGE;
}
