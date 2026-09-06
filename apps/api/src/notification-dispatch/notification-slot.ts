// 現在時刻を、日本時間の15分単位の枠（0/15/30/45分）へ丸めた結果。
// dateはNotificationSetting.lastNotifiedOnと比較できるよう、日本時間の暦日をUTC午前0時で表す
// （stock.service.tsのgetJapanDateと同じ考え方）。
export interface NotificationSlot {
  date: Date;
  hour: number;
  minute: number;
}

// Cloud Schedulerは15分ごとにこのバッチを呼ぶため、現在時刻をその枠に丸めてから
// NotificationSetting.notifyHour・notifyMinuteと比較する（01_Web_Push配信処理.md 2節）。
export function toNotificationSlot(now: Date): NotificationSlot {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((values, part) => {
      values[part.type] = part.value;
      return values;
    }, {});

  return {
    date: new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`),
    hour: Number(parts.hour),
    minute: Math.floor(Number(parts.minute) / 15) * 15,
  };
}
