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
