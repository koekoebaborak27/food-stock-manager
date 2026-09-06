const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

// 日時をJSTの「YYYY年M月D日 H:MM」形式にする
// （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節）。
export function formatDateTime(iso: string): string {
  const parts = DATE_TIME_FORMATTER.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}年${get("month")}月${get("day")}日 ${get("hour")}:${get("minute")}`;
}

// 期限（YYYY-MM-DDの日付だけの文字列）を「YYYY年M月D日」形式にする
// （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節「詳細・確認文」）。
// 日付だけの値のため時刻・タイムゾーンの変換はしない。
export function formatDateOnly(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

// 日時をJSTの日付部分だけ取り出し「YYYY年M月D日」形式にする。消費済にした日付など、
// 時刻の情報を持つ値でも時刻を出さない場面で使う
// （docs/specs/02_basic-design/00_共通/00_画面共通.md 4節）。
export function formatDateFromDateTime(iso: string): string {
  const parts = DATE_FORMATTER.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}年${get("month")}月${get("day")}日`;
}
