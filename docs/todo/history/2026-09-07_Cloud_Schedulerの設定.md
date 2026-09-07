# 2026-09-07 Cloud Schedulerの設定

## 目次

- [2026-09-07 配信バッチの定期実行ジョブを作成し、Web Push通知の到達を確認した（9c）](#2026-09-07-配信バッチの定期実行ジョブを作成しweb-push通知の到達を確認した9c)

## 2026-09-07 配信バッチの定期実行ジョブを作成し、Web Push通知の到達を確認した（9c）

[`infra_design_05_Cloud_Scheduler.md`](../../specs/99_infra/infra_design_05_Cloud_Scheduler.md)の手順どおりに進めた。

- `INTERNAL_NOTIFICATION_SECRET`はSecret Managerの`internal-notification-secret`に前回セッション（9b）でエージェントが生成・登録済みの値のため、`gcloud secrets versions access`で取得する計画だったが、このセッションでは秘密情報を扱うコマンドが自動モードのクラシファイアにブロックされた。ユーザー自身に値を取得してもらい、チャット経由で受け取って進めた。
- `gcloud scheduler jobs create http notification-dispatch --schedule="*/15 * * * *" ...`を素直に実行すると、[`インフラ構築.md`](../notes/インフラ構築.md#2026-09-06-artifact-registryの--descriptionに日本語を入れるとパス解釈が壊れる)と同じ「`gcloud.cmd`自体のパスが空白の位置で分割される」文字化けエラーになった。今回は日本語ではなく、cron式`*/15 * * * *`のスペースが原因と判明。`--flags-file`（YAML）に引数をまとめる方法で回避した。詳細・コピペ用コマンドは[`インフラ構築.md`](../notes/インフラ構築.md#2026-09-07-引数にスペースを含むgcloudcmd呼び出しは--flags-fileで回避する)に追記した。
- ジョブ`notification-dispatch`（`asia-northeast1`、15分ごと、Asia/Tokyo）を作成。`gcloud scheduler jobs run`で手動実行し、api側のログで`POST /api/internal/notifications/dispatch`が200であることを確認した。
- GCPコンソール（Cloud Scheduler）のジョブ一覧でも設定内容（Enabled・頻度・ターゲットURL）を目視確認した。
- ユーザーが本番アプリで通知設定をON・賞味期限が近い常備食を1件登録・通知時刻を直近に変更し、15分枠の実行でWeb Push通知の到達を確認した。9cはこれで完了。

次はタスク10（GitHub ActionsからCloud Runへの自動デプロイ、CI/CD）に着手する。
