# 05. Cloud Scheduler

[00_概要と全体構成](infra_design_00_概要と全体構成.md)の5番目の手順。期限通知の配信バッチ（`POST /api/internal/notifications/dispatch`）を15分ごとに起動する（15分刻みの理由は[`docs/todo/history/2026-09-05_未決事項の決定.md`](../../todo/history/2026-09-05_未決事項の決定.md)の「通知の刻みを15分に決める」を参照）。

## 1. ジョブの作成

認証は URL 側ではなく [Web Push配信処理 5節](../03_detail-design/40_期限通知/01_Web_Push配信処理.md#5-認証)のとおり `X-Internal-Secret` ヘッダーで行う（`INTERNAL_NOTIFICATION_SECRET` と同じ値）。

```bash
gcloud scheduler jobs create http notification-dispatch \
  --location=asia-northeast1 \
  --schedule="*/15 * * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://<apiサービスURL>/api/internal/notifications/dispatch" \
  --http-method=POST \
  --headers="X-Internal-Secret=<INTERNAL_NOTIFICATION_SECRETと同じ値>"
```

`<INTERNAL_NOTIFICATION_SECRETと同じ値>` は Secret Manager の `internal-notification-secret` と同じ値を直接コマンドに渡すことになる。シェル履歴に残るため、値を渡した直後にシェルの履歴（`history -d` 等）から該当行を消すか、値を書いたファイルを都度読み込む形にする。

## 2. 動作確認

1. ジョブ作成直後に手動実行して疎通を確認する。

   ```bash
   gcloud scheduler jobs run notification-dispatch --location=asia-northeast1
   ```

2. Cloud Run（api）のログで `notification-dispatch` からのリクエストが200で返っていることを確認する（`gcloud run services logs read api --region=asia-northeast1`）。
3. [04_Cloud_Run 5節](infra_design_04_Cloud_Run.md#5-動作確認)で登録した Web Push 購読に、期限が近い常備食を1件登録した状態で通知が届くか確認する（設定した通知時刻の15分枠に実行が重なるまで待つか、通知時刻を直近に変更して試す）。
