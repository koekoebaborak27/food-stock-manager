// 通知を有効にする操作のうち、端末に許可を求める前に確かめる2つの状態
// （docs/specs/02_basic-design/40_期限通知/00_期限通知共通.md 2節の1〜2番目）。
// ブラウザのグローバル値（navigator・window）から作った素材を受け取る純粋関数にして、
// テストで直接組み立てた値を渡せるようにする。
export interface BrowserSupportInput {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIosDevice: boolean;
  isStandaloneDisplay: boolean;
}

export type NotificationPrerequisiteReason = "UNSUPPORTED" | "IOS_NOT_INSTALLED";

export function checkNotificationPrerequisite(
  input: BrowserSupportInput,
): NotificationPrerequisiteReason | null {
  if (!input.hasServiceWorker || !input.hasPushManager || !input.hasNotification) {
    return "UNSUPPORTED";
  }
  if (input.isIosDevice && !input.isStandaloneDisplay) {
    return "IOS_NOT_INSTALLED";
  }
  return null;
}

// iPadOSはSafariのUAをMacintoshとして名乗るため、タッチ操作ができるかどうかも合わせて見る。
export function readBrowserSupport(): BrowserSupportInput {
  const ua = window.navigator.userAgent;
  const isIphoneOrIpod = /iphone|ipod/i.test(ua);
  const isIpad = /ipad/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

  return {
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    isIosDevice: isIphoneOrIpod || isIpad,
    isStandaloneDisplay:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
}
