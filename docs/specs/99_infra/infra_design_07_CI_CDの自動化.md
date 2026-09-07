# 07. CI/CD の自動化（GitHub Actions → Cloud Run）

[00_概要と全体構成](infra_design_00_概要と全体構成.md)〜[05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md)の手動デプロイが安定して動くことを確認したあとに着手する（[06_今後の課題 1節](infra_design_06_今後の課題.md#1-cicd-の自動化)の方針どおり）。

`main` への push（`.github/workflows/ci.yml` の `verify` ジョブが通ったあと）で、[04_Cloud_Run](infra_design_04_Cloud_Run.md)と同じ手順（api → web の順）を自動実行する。認証はサービスアカウントキーを使わず、**Workload Identity 連携**（GitHub Actions の OIDC トークンで GCP のサービスアカウントを借用する方式）を使う。

## 1. Workload Identity 連携の GCP 側準備

以下はすべて GCP プロジェクトのオーナー権限を持つ人が実行する（`gcloud` CLI、または GCP コンソールの「IAM と管理」から同等の操作でもよい）。

### 1-1. 必要な API の有効化

[01_事前準備 3節](infra_design_01_事前準備.md#3-必要な-api-の有効化)で有効化した API に加え、Workload Identity 連携に使う API を有効化する。

```bash
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com
```

### 1-2. デプロイ専用サービスアカウントの作成

GitHub Actions が借用するサービスアカウントを新規に作る（既存の Cloud Run 実行用サービスアカウントとは分ける）。

```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"
```

### 1-3. デプロイ専用サービスアカウントへの権限付与

| ロール | 付与先 | 用途 |
| --- | --- | --- |
| `roles/artifactregistry.writer` | プロジェクト | Docker イメージの push |
| `roles/run.developer` | プロジェクト | Cloud Run サービスのデプロイ |
| `roles/iam.serviceAccountUser` | Cloud Run 実行用サービスアカウント（既定のCompute Engineサービスアカウント） | Cloud Run が実行時に使うサービスアカウントを「代わりに使う」権限。これがないと `gcloud run deploy` が権限エラーになる |

```bash
gcloud projects add-iam-policy-binding <プロジェクトID> \
  --member="serviceAccount:github-actions-deployer@<プロジェクトID>.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding <プロジェクトID> \
  --member="serviceAccount:github-actions-deployer@<プロジェクトID>.iam.gserviceaccount.com" \
  --role="roles/run.developer"

gcloud iam service-accounts add-iam-policy-binding <プロジェクト番号>-compute@developer.gserviceaccount.com \
  --member="serviceAccount:github-actions-deployer@<プロジェクトID>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 1-4. Workload Identity プールとプロバイダの作成

```bash
gcloud iam workload-identity-pools create github-actions-pool \
  --location="global" \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-actions-provider \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Actions OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '<GitHubオーナー>/<リポジトリ名>'"
```

`--attribute-condition` で **このリポジトリの push だけ**が借用できるように絞る（絞らないと、同じ Workload Identity プールを知っている別のリポジトリからもサービスアカウントを借用できてしまう）。

### 1-5. サービスアカウントへの借用許可

作成したプロバイダ（＝このリポジトリの GitHub Actions）が、1-2 のサービスアカウントを借用できるようにする。

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@<プロジェクトID>.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<プロジェクト番号>/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/<GitHubオーナー>/<リポジトリ名>"
```

### 1-6. ワークフローに渡す値の確認

GitHub 側の Secrets 登録（2節）に使うため、プロバイダのフルパスを確認しておく。

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)"
```

## 2. GitHub リポジトリの Secrets 登録

GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」→「New repository secret」から、次を登録する（すべて GitHub の画面操作。ユーザー自身が行う）。

| Secret 名 | 値 | 取得方法 |
| --- | --- | --- |
| `WIF_PROVIDER` | 1-6 で確認したプロバイダのフルパス（`projects/<プロジェクト番号>/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`） | 1-6 のコマンド出力 |
| `WIF_SERVICE_ACCOUNT` | `github-actions-deployer@<プロジェクトID>.iam.gserviceaccount.com` | 1-2 で作成した値 |
| `GCP_PROJECT_ID` | `<プロジェクトID>` | GCP コンソール左上のプロジェクト選択 |
| `VAPID_PUBLIC_KEY` | 本番用 VAPID 公開鍵 | Secret Manager の `vapid-public-key` シークレット（[03_Secret_Manager](infra_design_03_Secret_Manager.md)で登録済みの値と同じもの） |

サービスアカウントキー（JSON）は発行・登録しない（Workload Identity 連携はキーレス認証のため不要）。

## 3. ワークフローの変更内容

`.github/workflows/ci.yml` の `verify` ジョブの後ろに、`deploy-api` → `deploy-web` の2ジョブを追加する。

- **起動条件**: `push` イベントかつ `main` ブランチのみ（`pull_request` では動かさない。本番へ触れる操作のため）。
- **認証**: `google-github-actions/auth@v2` に `WIF_PROVIDER` / `WIF_SERVICE_ACCOUNT` を渡す。ジョブに `permissions: id-token: write` が必須（OIDC トークン発行に要る）。
- **順序**: [04_Cloud_Run](infra_design_04_Cloud_Run.md)と同じ理由（web のビルドが api の URL に依存する）で `deploy-web` は `deploy-api` の完了を `needs:` で待つ。`deploy-api` が確認した api の URL を `outputs` 経由で `deploy-web` に渡す。
- **タグ**: [02_Artifact_Registry](infra_design_02_Artifact_Registry.md)と同じ方針で `${{ github.sha }}`（コミットハッシュ）を使う。
- `--set-secrets` の内容は[04_Cloud_Run 2節](infra_design_04_Cloud_Run.md#2-api-のデプロイ)と同一（Secret Manager 側の変更にあわせて両方直す）。

## 4. 動作確認

1. ドキュメント以外の変更（[gitの操作ルール](../../development/gitの操作ルール.md)どおり feature ブランチ → PR）を `main` にマージする。
2. GitHub の「Actions」タブで、`verify` → `deploy-api` → `deploy-web` の順に緑（成功）になることを確認する。
3. `https://<webサービスURL>` を開き、変更が反映されていることを確認する（[04_Cloud_Run 5節](infra_design_04_Cloud_Run.md#5-動作確認)と同じ確認項目でよい）。
4. 失敗した場合は Actions の該当ジョブのログで、どのステップ（認証／build／push／deploy）で失敗したかを特定する。認証失敗（`permission denied` 等）は 1節の IAM 権限・`--attribute-condition` のリポジトリ名を疑う。
