# 00. 概要と全体構成

## 1. 全体構成

```
利用者のブラウザ
   │  https://<webサービスURL>
   ▼
Cloud Run（web / Next.js standalone）
   │  Next.js の rewrites で /api/* をそのまま転送する
   │  https://<apiサービスURL>（サービス間通信。ブラウザは直接叩かない）
   ▼
Cloud Run（api / NestJS）
   │  DATABASE_URL
   ▼
Supabase（PostgreSQL）

Cloud Scheduler（15分ごと）
   │  POST https://<apiサービスURL>/api/internal/notifications/dispatch
   │  ヘッダー X-Internal-Secret
   ▼
Cloud Run（api）
```

- ブラウザは **web の URL しか知らない**。`/api/*` へのアクセスは `apps/web/next.config.ts` の rewrites が api へ転送する（[`apps/web/Dockerfile`](../../../apps/web/Dockerfile) の ARG `API_BASE_URL` としてビルド時に焼き込まれる。実行時に変えても反映されない）。Google ログインのコールバック（`GOOGLE_CALLBACK_URL`）も同じ理由で **web の URL** を使う。
- api は Cloud Scheduler からの内部呼び出し（`X-Internal-Secret` ヘッダーでの認証）を受けるため、web だけでなく api の URL も外部に公開される。ただし通常の利用者は api の URL を直接叩く必要がない。
- Artifact Registry・Secret Manager はどちらの Cloud Run サービスからも参照する共通基盤。

## 2. 使う GCP リソース

| リソース | 用途 | 課金の考え方 |
| --- | --- | --- |
| Cloud Run（web / api） | アプリ本体の実行 | リクエスト処理時間 + 常駐インスタンス数に応じた課金。最小インスタンス数 0 なら未使用時は0円（詳細は[4節](#4-未決事項の決定)） |
| Artifact Registry | Docker イメージの保管 | 保存容量に応じた課金（少量なら無料枠内） |
| Secret Manager | 環境変数の秘密値（DB接続文字列・OAuthシークレット等）の保管 | シークレットのバージョン数・アクセス回数に応じた課金（少量なら無料枠内） |
| Cloud Scheduler | 期限通知の配信バッチを15分ごとに起動 | ジョブ本数に応じた課金（[`docs/todo/history/2026-09-05_未決事項の決定.md`](../../todo/history/2026-09-05_未決事項の決定.md)の「通知の配信を単一のスケジューラに決める」を参照。無料枠は3ジョブまでの見込みだが未確認） |
| Supabase（PostgreSQL） | データベース本体 | GCP 外。無料枠の範囲で運用（[6.7 コスト](../01_requirements/00_共通/01_プロダクト共通.md#67-コスト)） |

## 3. デプロイの順序

各サービスに依存関係があるため、必ずこの順で進める。

1. [01_事前準備](infra_design_01_事前準備.md) — GCPプロジェクト・課金・API有効化・Supabaseプロジェクト・Google OAuthクライアント
2. [02_Artifact_Registry](infra_design_02_Artifact_Registry.md) — イメージ置き場の作成、初回ビルド&push
3. [03_Secret_Manager](infra_design_03_Secret_Manager.md) — 環境変数の秘密値を登録
4. [04_Cloud_Run](infra_design_04_Cloud_Run.md) — **api を先にデプロイして URL を確定 → その URL を使って web を再ビルド・デプロイ**（web のビルドが api の URL に依存するため、この順を逆にできない）
5. [05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md) — 期限通知の配信バッチを定期実行するジョブを作成

その後の課題は [06_今後の課題](infra_design_06_今後の課題.md) にまとめた。

## 4. 未決事項の決定

[`01_プロダクト共通.md` 10節](../01_requirements/00_共通/01_プロダクト共通.md#10-未決事項)にあった2件をここで決めた。経緯は [`docs/todo/history/2026-09-06_インフラ構築の準備.md`](../../todo/history/2026-09-06_インフラ構築の準備.md) に残す。

| # | 未決事項 | 決定 |
| --- | --- | --- |
| 1 | Cloud Run の最小インスタンス数を0のままとするか | **0のままとする**（[6.7 コスト](../01_requirements/00_共通/01_プロダクト共通.md#67-コスト)の基本方針どおり。起動待ちが体験を損なうと分かった場合に見直す） |
| 2 | Supabase のバックアップ取得頻度と保持期間 | **無料プランの既定値をそのまま使う**（個別設定はしない。有料プランでのみ変更可能なため） |
