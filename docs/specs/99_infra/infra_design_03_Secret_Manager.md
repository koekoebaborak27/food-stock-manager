# 03. Secret Manager

[00_概要と全体構成](infra_design_00_概要と全体構成.md)の3番目の手順。[`.env.example`](../../../.env.example)にある本番で必要な値を Secret Manager へ登録する。

## 1. 登録するシークレット一覧

`.env.example` のうち、画面操作テスト用の値（`E2E_*`）を除いたものを登録する。シークレット名は分かりやすいように `.env.example` のキーをそのまま小文字にする。

| シークレット名 | `.env.example` のキー | 使うサービス |
| --- | --- | --- |
| `database-url` | `DATABASE_URL` | api（[01_事前準備 4節](infra_design_01_事前準備.md#4-supabase-プロジェクトの作成)で取得したトランザクションプーラーの接続文字列） |
| `direct-url` | `DIRECT_URL` | api（同じく4節で取得したセッションプーラーの接続文字列。マイグレーション実行時のみ使う） |
| `google-client-id` | `GOOGLE_CLIENT_ID` | api |
| `google-client-secret` | `GOOGLE_CLIENT_SECRET` | api |
| `google-callback-url` | `GOOGLE_CALLBACK_URL` | api（値は `https://<webサービスURL>/api/auth/google/callback`。[04_Cloud_Run 4節](infra_design_04_Cloud_Run.md#4-google-oauth-リダイレクト-uri-の確定)で web の URL 確定後に登録する） |
| `web-base-url` | `WEB_BASE_URL` | api（値は `https://<webサービスURL>`） |
| `vapid-public-key` | `VAPID_PUBLIC_KEY` | api |
| `vapid-private-key` | `VAPID_PRIVATE_KEY` | api |
| `vapid-subject` | `VAPID_SUBJECT` | api |
| `internal-notification-secret` | `INTERNAL_NOTIFICATION_SECRET` | api（Cloud Scheduler 側にも同じ値を設定する。[05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md)参照） |

`NEXT_PUBLIC_VAPID_PUBLIC_KEY`（web）はビルド時に焼き込む値のため Secret Manager には登録しない（[02_Artifact_Registry](infra_design_02_Artifact_Registry.md)参照）。値自体は `vapid-public-key` と同じ。

## 2. シークレットの作成

値を直接コマンドライン引数に書くと shell の履歴に残るため、ファイルまたは標準入力から渡す。

```bash
printf '%s' '<実際の値>' | gcloud secrets create database-url --data-file=-
```

値を更新する場合（バージョンが増える。Cloud Run 側は最新版を参照するよう `--set-secrets` で指定する）:

```bash
printf '%s' '<新しい値>' | gcloud secrets versions add database-url --data-file=-
```

上記を、`direct-url` を除く9個のシークレットぶん繰り返す（`direct-url` はマイグレーション実行時にローカルから手動で参照するだけで Cloud Run へは渡さないため、[3節](#3-cloud-run-サービスアカウントへの権限付与)の権限付与は不要）。

## 3. Cloud Run サービスアカウントへの権限付与

Cloud Run サービスの実行に使うサービスアカウント（既定では `<プロジェクト番号>-compute@developer.gserviceaccount.com`。専用のサービスアカウントを作る場合はそちらの ID）に、シークレットを読む権限を渡す。

```bash
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:<Cloud Run実行サービスアカウント>" \
  --role="roles/secretmanager.secretAccessor"
```

`direct-url` を除く9個のシークレットに同じ付与を行う。実際に Cloud Run へ渡す指定は [04_Cloud_Run](infra_design_04_Cloud_Run.md) の `--set-secrets` オプションで行う。
