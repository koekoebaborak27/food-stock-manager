# 04. Cloud Run サービス

[00_概要と全体構成](infra_design_00_概要と全体構成.md)の4番目の手順。**api → web の順でしかデプロイできない**（web のビルドが api の URL に依存するため。[02_Artifact_Registry](infra_design_02_Artifact_Registry.md)参照）。

## 1. 本番データベースへのマイグレーション適用

api を初めてデプロイする前に、Supabase側のデータベースへスキーマを反映する。適用コマンドは実行環境（コンテナ）の中からではなく、**ローカルから手動で行う**（[`docs/prisma_operations.md` 3-1節](../../prisma_operations.md#3-1-適用方法)の方針どおり）。

```bash
DATABASE_URL="<Secret Managerのdatabase-urlと同じ値>" \
DIRECT_URL="<Secret Managerのdirect-urlと同じ値>" \
pnpm exec prisma migrate deploy
```

以降、スキーマを変更するたびにこのコマンドを実行してから api をデプロイし直す。

## 2. api のデプロイ

```bash
gcloud run deploy api \
  --image=asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/api:<タグ> \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=2 \
  --set-secrets=DATABASE_URL=database-url:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GOOGLE_CALLBACK_URL=google-callback-url:latest,WEB_BASE_URL=web-base-url:latest,VAPID_PUBLIC_KEY=vapid-public-key:latest,VAPID_PRIVATE_KEY=vapid-private-key:latest,VAPID_SUBJECT=vapid-subject:latest,INTERNAL_NOTIFICATION_SECRET=internal-notification-secret:latest
```

- `--allow-unauthenticated` — Cloud Scheduler からの内部呼び出しは URL 認証ではなく `X-Internal-Secret` ヘッダーで守っている（[Web Push配信処理 5節](../03_detail-design/40_期限通知/01_Web_Push配信処理.md#5-認証)）ため、サービス自体は未認証で公開してよい。
- `--min-instances=0` — [未決事項の決定](infra_design_00_概要と全体構成.md#4-未決事項の決定)のとおり0のまま。
- `--max-instances=2` — 家庭内利用の想定台数を超える負荷が来ないための上限。値は運用しながら調整する。
- **この時点では `google-callback-url` と `web-base-url` シークレットはまだ web の本番 URL で作られていない**（4節で確定させてから登録し直す）。初回デプロイでは仮に `http://localhost:3000` 相当の値を入れておき、4節のあとに更新・再デプロイする。
- `DATABASE_URL` には Secret Manager の `database-url`（トランザクションプーラー）を使う。`DIRECT_URL` は1節でローカルから手動実行するときだけ使うため、Cloud Run には渡さない。

デプロイ後、次のコマンドで URL を確認する。

```bash
gcloud run services describe api --region=asia-northeast1 --format="value(status.url)"
```

## 3. web のビルドし直しとデプロイ

2で確認した URL を使って web イメージを作り直す（[02_Artifact_Registry 3節](infra_design_02_Artifact_Registry.md#3-イメージのビルドと-push)）。

```bash
gcloud run deploy web \
  --image=asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/web:<タグ> \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=2
```

web は `.env.example` の値をビルド時に焼き込む構成（[Dockerfile](../../../apps/web/Dockerfile)）のため、実行時の環境変数・シークレットは不要。

デプロイ後、URL を確認する。

```bash
gcloud run services describe web --region=asia-northeast1 --format="value(status.url)"
```

## 4. Google OAuth リダイレクト URI の確定

1. [01_事前準備 5節](infra_design_01_事前準備.md#5-google-oauth-クライアントの作成)で後回しにした「承認済みのリダイレクト URI」に `https://<webサービスURL>/api/auth/google/callback` を追加する。
2. `google-callback-url` シークレットを同じ値で更新し、`web-base-url` シークレットも `https://<webサービスURL>` で更新する（[03_Secret_Manager 2節](infra_design_03_Secret_Manager.md#2-シークレットの作成)の更新コマンド）。
3. api を再デプロイして新しいシークレットの値を反映する（イメージは変えず、`gcloud run services update api --region=asia-northeast1` で再デプロイしてもよい）。

## 5. 動作確認

1. `https://<webサービスURL>` をブラウザで開き、Google ログインが完了して常備食リスト画面まで進むことを確認する。
2. 常備食の登録・買い物リストへの追加など、DB 更新を伴う操作を1つ行い、Supabase の Table Editor でデータが入ることを確認する。
3. 通知の設定画面から Web Push の購読を1件登録する（[05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md)のジョブ作成後、配信されるか確認する材料になる）。
