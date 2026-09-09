"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  disableNotification,
  enableNotification,
  getSubscriptionStatus,
  NotificationGuidanceDialog,
  type NotificationGuidanceReason,
} from "@/modules/push-notification";
import { showErrorToast, showSuccessToast } from "@/shared/ui/toast";
import { GENERIC_ERROR_MESSAGE, LOAD_FAILED_MESSAGE } from "../error-messages";
import { getNotificationTime, updateNotificationTime } from "../service";
import type { NotificationTime } from "../types";

// 選べる分は0・15・30・45の4つだけ（00_期限通知共通.md 5節）。
const MINUTE_OPTIONS = [0, 15, 30, 45];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

// 通知の設定画面。ヘッダーのメニューから開く子画面で、下部タブと追加ボタンは出さない
// （docs/specs/02_basic-design/40_期限通知/10_通知の設定.md）。
export function NotificationSettingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isTogglePending, setIsTogglePending] = useState(false);
  const [time, setTime] = useState<NotificationTime>({ hour: 8, minute: 0 });
  const [isTimePending, setIsTimePending] = useState(false);
  const [guidanceReason, setGuidanceReason] = useState<NotificationGuidanceReason | null>(null);

  // 画面を開いたときだけ読み込む（10_通知の設定.md 2節）。
  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    setIsLoading(true);
    setHasError(false);
    try {
      // 片方だけ古い状態にならないよう、購読状態と通知時刻を同時に取得する。
      const [subscription, notificationTime] = await Promise.all([
        getSubscriptionStatus(),
        getNotificationTime(),
      ]);
      setSubscribed(subscription.subscribed);
      setTime(notificationTime);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // トグルをオンにする。途中で止まった場合はオフへ戻し、理由に応じた案内ダイアログを出す
  // （00_期限通知共通.md 2〜3節）。案内対象でない失敗（登録の通信失敗）は帯で伝える。
  function handleEnable(): void {
    // 通信完了を待たずに見た目を切り替え、操作した結果をすぐに画面へ反映する。
    setSubscribed(true);
    setIsTogglePending(true);
    void (async () => {
      try {
        const result = await enableNotification();
        if (result.ok) {
          showSuccessToast("保存しました");
        } else {
          // 端末やブラウザの設定で登録できない場合は、表示を元へ戻して対処方法を案内する。
          setSubscribed(false);
          setGuidanceReason(result.reason);
        }
      } catch {
        // 通信エラーでは案内ダイアログを出さず、画面上の状態だけを元へ戻す。
        setSubscribed(false);
        showErrorToast(GENERIC_ERROR_MESSAGE);
      } finally {
        setIsTogglePending(false);
      }
    })();
  }

  // トグルをオフにする。確認ダイアログは出さない（00_期限通知共通.md 4節）。
  function handleDisable(): void {
    // 停止操作もすぐに反映し、保存に失敗したときだけ購読中の表示へ戻す。
    setSubscribed(false);
    setIsTogglePending(true);
    void (async () => {
      try {
        await disableNotification();
        showSuccessToast("保存しました");
      } catch {
        // 端末側の登録が残っている可能性があるため、停止前の表示を保つ。
        setSubscribed(true);
        showErrorToast(GENERIC_ERROR_MESSAGE);
      } finally {
        setIsTogglePending(false);
      }
    })();
  }

  // 通知時刻を変える。保存に失敗したら選択前の値に戻す（10_通知の設定.md 4節）。
  function handleTimeChange(next: NotificationTime): void {
    const previous = time;
    // 選択した時刻をただちに表示し、保存できなければ選択前の時刻へ戻す。
    setTime(next);
    setIsTimePending(true);
    void (async () => {
      try {
        await updateNotificationTime(next);
        showSuccessToast("保存しました");
      } catch {
        setTime(previous);
        showErrorToast(GENERIC_ERROR_MESSAGE);
      } finally {
        setIsTimePending(false);
      }
    })();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-12">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="戻る" className="text-muted-foreground">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">通知の設定</h1>
      </header>

      {isLoading ? <SettingSkeleton /> : null}

      {!isLoading && hasError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">{LOAD_FAILED_MESSAGE}</p>
          {/* 読み込み失敗時は画面遷移なしで、初期取得だけをやり直せるようにする。 */}
          <Button type="button" variant="secondary" onClick={() => void load()}>
            もう一度読み込む
          </Button>
        </div>
      ) : null}

      {!isLoading && !hasError ? (
        <div className="flex flex-col gap-8">
          <section className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="notification-toggle">通知を受け取る</Label>
              <p className="text-xs text-muted-foreground">この端末で期限の通知を受け取ります。</p>
            </div>
            {/* 保存中の連続操作を防ぎ、状態が戻る競合を避ける。 */}
            <button
              id="notification-toggle"
              type="button"
              role="switch"
              aria-checked={subscribed}
              disabled={isTogglePending}
              onClick={() => (subscribed ? handleDisable() : handleEnable())}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                subscribed ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 size-5 rounded-full bg-background transition-transform ${
                  subscribed ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <Label>通知時刻</Label>
            <div className="flex items-center gap-2">
              <select
                aria-label="時"
                value={time.hour}
                disabled={isTimePending}
                onChange={(event) =>
                  handleTimeChange({ hour: Number(event.target.value), minute: time.minute })
                }
                className="h-12 flex-1 rounded-lg border bg-background px-3 text-base disabled:opacity-50"
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}時
                  </option>
                ))}
              </select>
              <div className="flex flex-1 gap-1" role="radiogroup" aria-label="分">
                {MINUTE_OPTIONS.map((minute) => (
                  <Button
                    key={minute}
                    type="button"
                    variant={time.minute === minute ? "default" : "secondary"}
                    size="sm"
                    role="radio"
                    aria-checked={time.minute === minute}
                    disabled={isTimePending}
                    className="h-12 flex-1 rounded-full px-0"
                    onClick={() => handleTimeChange({ hour: time.hour, minute })}
                  >
                    {minute}分
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ご家族の誰かが変更すると、全員の通知時刻が変わります。
            </p>
          </section>
        </div>
      ) : null}

      <NotificationGuidanceDialog
        reason={guidanceReason}
        onOpenChange={() => setGuidanceReason(null)}
      />
    </main>
  );
}

// 読み込み中に、通知トグルと通知時刻の枠と同じ大きさの灰色の枠を出す。
function SettingSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-20 animate-pulse rounded-lg border bg-muted" />
      <div className="h-24 animate-pulse rounded-lg border bg-muted" />
    </div>
  );
}
