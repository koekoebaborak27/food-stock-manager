# 01. 事前準備

[00_概要と全体構成](infra_design_00_概要と全体構成.md)の1番目の手順。ここで作った値は、後続の手順すべてで使う。実際の値はここには書かず、[`docs/todo/notes/`](../../todo/notes/README.md) 側の運用ノートに残すこと（このファイルはプレースホルダのみ）。

## 1. GCP プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) を開き、画面上部のプロジェクト選択メニューから「新しいプロジェクト」を選ぶ。
2. プロジェクト名に `<プロジェクト名>`（個人学習用と分かる名前）を入力し、「作成」を押す。
3. 作成後、プロジェクト ID（`<プロジェクトID>`。作成時に自動生成される小文字英数字の文字列。プロジェクト名とは別物）を控える。以降のコマンドはすべてこの ID を使う。

## 2. 課金の設定

1. 左メニュー「お支払い」から、個人のクレジットカードを登録した請求先アカウントを、1で作ったプロジェクトに紐づける。
2. 「予算とアラート」で、月額の上限に近い金額（例: 1,000円）にアラートを設定する。想定外の課金に早く気付くため。

## 3. 必要な API の有効化

「API とサービス」→「ライブラリ」から、次を検索して有効化する（`gcloud services enable` でもよい）。

| API | 用途 |
| --- | --- |
| Cloud Run Admin API | Cloud Run サービスのデプロイ |
| Artifact Registry API | Docker イメージの保管 |
| Secret Manager API | 環境変数の秘密値の保管 |
| Cloud Scheduler API | 期限通知の配信バッチの定期起動 |
| Cloud Build API | `gcloud builds submit` でイメージをビルドする場合に使用（[02_Artifact_Registry](infra_design_02_Artifact_Registry.md)参照） |

```bash
gcloud config set project <プロジェクトID>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com cloudscheduler.googleapis.com cloudbuild.googleapis.com
```

## 4. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/) にログインし、「New project」を押す。
2. プロジェクト名に `<プロジェクト名>`、リージョンに東京に近いもの（`Northeast Asia (Tokyo)` があればそれ）を選び、データベースパスワード（`<DBパスワード>`）を設定して作成する。
3. 作成後、プロジェクト画面右上の「Connect」ボタン→「ORM」タブ→「Prisma」を選ぶと、Prisma 向けの接続文字列が2本表示される。**この2本をそのまま使う。**
   - `DATABASE_URL`（トランザクションプーラー、ポート6543）— アプリの通常アクセス用。Cloud Run はリクエストごとに接続が増減するサーバーレス環境のため、直接接続ではなくこちらを使う。
   - `DIRECT_URL`（セッションプーラー）— マイグレーション（`prisma migrate deploy`）専用。トランザクションプーラーはプリペアドステートメントに対応せず DDL の実行に使えないため分けている（[`prisma/schema.prisma`](../../../prisma/schema.prisma)の`directUrl`。詳細は[`docs/prisma_operations.md` 3-1節](../../prisma_operations.md#3-1-適用方法)）。
4. `DATABASE_URL` と `DIRECT_URL` の実値は、[03_Secret_Manager](infra_design_03_Secret_Manager.md)で Secret Manager に登録する。

## 5. Google OAuth クライアントの作成

家族グループ機能はGoogleログインのみを使う（[認証と家族グループの基本設計](../02_basic-design/10_認証と家族グループ/README.md)）。本番用の OAuth クライアントをここで作る。

1. [Google Cloud Console](https://console.cloud.google.com/) の「API とサービス」→「OAuth 同意画面」で、User Type を「External」にして作成する（個人の学習用途のため、テストユーザーとして自分の Google アカウントを追加する運用でよい。一般公開の審査は不要）。
2. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」を選び、アプリケーションの種類を「ウェブ アプリケーション」にする。
3. **「承認済みのリダイレクト URI」は、この時点ではまだ web の本番 URL が決まっていないため後回しにする。** [04_Cloud_Run](infra_design_04_Cloud_Run.md)で web をデプロイし URL が確定したあと、`https://<webサービスURL>/api/auth/google/callback` を追加しに戻ってくる（[`.env.example`](../../../.env.example)の`GOOGLE_CALLBACK_URL`の説明のとおり、ブラウザは web の URL しか知らないため、コールバック URL も web 側にする）。
4. 作成すると発行される クライアント ID（`<GoogleクライアントID>`）とクライアントシークレット（`<Googleクライアントシークレット>`）を控える。

## 6. 決めた値の記録先

この手順で作った値（プロジェクト ID・Supabase 接続情報・Google OAuth の ID/シークレット等）は、**このリポジトリの `docs/` 配下には書かない。** 個人のパスワードマネージャ等で管理し、Secret Manager への登録時のみ使う。
