// 画面共通の失敗文言。原因を画面で安全に判断できない失敗に使う。
export const GENERIC_ERROR_MESSAGE = "うまくいきませんでした。もう一度お試しください。";

// APIのcodeごとの文言（docs/specs/02_basic-design/30_買い物リスト/10_買い物リスト.md 7節、
// 00_共通/03_共通文言.md）。
const MESSAGES_BY_CODE: Record<string, string> = {
  SHOPPING_ITEM_NAME_REQUIRED: "入力してください",
  SHOPPING_ITEM_NAME_TOO_LONG: "30文字以内で入力してください",
  SHOPPING_ITEM_ALREADY_EXISTS: "この商品はすでにリストにあります。",
  SHOPPING_ITEM_NOT_FOUND:
    "このデータは見つかりませんでした。ご家族の誰かが削除した可能性があります。",
  SOURCE_STOCK_NOT_FOUND:
    "このデータは見つかりませんでした。ご家族の誰かが削除した可能性があります。",
  SOURCE_STOCK_QUANTITY_LIMIT:
    "元の常備食は残数が99のため追加できません。「常備食へ戻さない」を選ぶか、常備食の残数を確認してください。",
  INVALID_PURCHASE_UPDATE:
    "入力内容を確認できませんでした。画面を読み込み直して、もう一度お試しください。",
  VALIDATION_ERROR:
    "入力内容を確認できませんでした。画面を読み込み直して、もう一度お試しください。",
};

// APIのcodeに対応する利用者向け文言を返す。
export function messageForCode(code: string): string {
  return MESSAGES_BY_CODE[code] ?? GENERIC_ERROR_MESSAGE;
}
