// 世帯単位の通知時刻（GET/PATCH /api/notification-settings の応答と同じ形）。
export interface NotificationTime {
  hour: number;
  minute: number;
}
