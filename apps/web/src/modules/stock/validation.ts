const MAX_NAME_LENGTH = 30;
const MAX_MEMO_LENGTH = 200;
const MIN_QUANTITY = 0;
const MAX_QUANTITY = 99;

// 食品名を確かめる。問題なければnull、問題があれば入力欄の下に出す文言を返す
// （docs/specs/02_basic-design/20_常備食管理/11_常備食の登録編集.md 2）。
export function validateStockName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "入力してください";
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${MAX_NAME_LENGTH}文字以内で入力してください`;
  }
  return null;
}

// 残数の入力を確かめる。数字入力欄の生の文字列を受け取る。
export function validateQuantityInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || !Number.isInteger(Number(trimmed))) {
    return "数字で入力してください";
  }
  const value = Number(trimmed);
  if (value < MIN_QUANTITY || value > MAX_QUANTITY) {
    return "0以上99以下で入力してください";
  }
  return null;
}

// メモを確かめる。任意項目のため未入力は問題としない。
export function validateMemo(memo: string): string | null {
  if (memo.length > MAX_MEMO_LENGTH) {
    return `${MAX_MEMO_LENGTH}文字以内で入力してください`;
  }
  return null;
}
