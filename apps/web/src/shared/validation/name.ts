const MAX_NAME_LENGTH = 20;

// 名前として使う入力を確かめる。問題なければnull、問題があれば入力欄の下に出す文言を返す。
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "入力してください";
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${MAX_NAME_LENGTH}文字以内で入力してください`;
  }
  return null;
}
