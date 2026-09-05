import type { StockSort, StorageType } from "./types";

export type ExpiryStatus = "EXPIRED" | "TODAY" | "TOMORROW" | "SOON" | "NORMAL";

interface ExpiryLabel {
  status: ExpiryStatus;
  label: string;
}

// 常備食一覧の条件をAPIが受け取る問い合わせ文字列へ変換する。
export function buildStockListQuery({
  storageType,
  keyword,
  sort,
  urgentOnly,
}: {
  storageType: StorageType | null;
  keyword: string;
  sort: StockSort;
  urgentOnly: boolean;
}): string {
  const params = new URLSearchParams({ sort });
  if (storageType) {
    params.set("storageType", storageType);
  }
  if (keyword.trim()) {
    params.set("keyword", keyword.trim());
  }
  if (urgentOnly) {
    params.set("urgentOnly", "true");
  }
  return params.toString();
}

// 期限の日付を日本時間の今日と比べ、タグに出す状態と文言を返す。
export function getExpiryLabel(expiresOn: string, now = new Date()): ExpiryLabel {
  const today = getJapanDate(now);
  const expiry = new Date(`${expiresOn}T00:00:00.000Z`);
  const difference = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (difference < 0) {
    return { status: "EXPIRED", label: `期限切れ（${Math.abs(difference)}日前）` };
  }
  if (difference === 0) {
    return { status: "TODAY", label: "今日まで" };
  }
  if (difference === 1) {
    return { status: "TOMORROW", label: "明日まで" };
  }
  if (difference <= 3) {
    return { status: "SOON", label: `あと${difference}日` };
  }
  return { status: "NORMAL", label: `${expiry.getUTCMonth() + 1}/${expiry.getUTCDate()}まで` };
}

// 残数と任意の単位をつなげ、単位がなければ数字だけを返す。
export function formatQuantity(quantity: number, unit: string | null): string {
  const labels: Record<NonNullable<typeof unit>, string> = {
    PIECE: "個",
    BAG: "袋",
    PACK: "パック",
    SERVING: "食分",
    BOTTLE: "本",
    GOTO: "ごと",
  };
  return unit ? `${quantity}${labels[unit]}` : String(quantity);
}

// 現在時刻から日本時間の暦日を、日付だけの期限と比較できるUTCの午前0時へ変換する。
function getJapanDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((values, part) => {
      values[part.type] = part.value;
      return values;
    }, {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}
