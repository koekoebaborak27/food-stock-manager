// 通知を有効にできないときの理由。ダイアログの見出し・本文の出し分けに使う
// （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 3節）。
export type NotificationGuidanceReason = "UNSUPPORTED" | "IOS_NOT_INSTALLED" | "PERMISSION_DENIED";
