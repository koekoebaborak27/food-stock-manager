const MAX_NAME_LENGTH = 30;

// 直接入力する商品名を確かめる。問題なければnull、問題があれば入力欄の下に出す文言を返す
// （docs/specs/02_basic-design/30_買い物リスト/10_買い物リスト.md 3・7節）。
export function validateShoppingItemName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "入力してください";
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${MAX_NAME_LENGTH}文字以内で入力してください`;
  }
  return null;
}
