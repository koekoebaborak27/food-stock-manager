# 02. Artifact Registry とイメージの準備

[00_概要と全体構成](infra_design_00_概要と全体構成.md)の2番目の手順。web / api の Docker イメージを置くリポジトリを作り、初回のビルドと push を行う。

リージョンは `asia-northeast1`（東京）に統一する。Cloud Run・Artifact Registry・Cloud Scheduler をすべて同じリージョンに置き、リージョンをまたぐ通信を避ける。

## 1. リポジトリの作成

```bash
gcloud artifacts repositories create <リポジトリ名> \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="food-stock-manager のweb/apiイメージ"
```

## 2. Docker の認証設定

ローカル（または CI）から push できるように、Docker の認証情報を設定する。

```bash
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

## 3. イメージのビルドと push

イメージのタグは `<リージョン>-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/<イメージ名>:<タグ>` の形。タグは git のコミットハッシュ（`git rev-parse --short HEAD`）を使い、`latest` には固定しない（どのコミットが動いているか Cloud Run の画面から追えるようにするため）。

api には環境変数に依存するビルド時引数がないため、そのままビルドできる。

```bash
docker build -f apps/api/Dockerfile \
  -t asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/api:<タグ> .
docker push asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/api:<タグ>
```

web は [`apps/web/Dockerfile`](../../../apps/web/Dockerfile) の ARG `API_BASE_URL` を **api の本番 URL** に、`NEXT_PUBLIC_VAPID_PUBLIC_KEY` を本番用の VAPID 公開鍵にして焼き込む必要がある。**api の URL が決まるのは[04_Cloud_Run](infra_design_04_Cloud_Run.md)で api を先にデプロイしたあとなので、web のビルドはそれより後に行う。**

```bash
docker build -f apps/web/Dockerfile \
  --build-arg API_BASE_URL=https://<apiサービスURL> \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=<VAPID公開鍵> \
  -t asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/web:<タグ> .
docker push asia-northeast1-docker.pkg.dev/<プロジェクトID>/<リポジトリ名>/web:<タグ>
```

api の URL が変わった場合（サービス名やリージョンを変更した場合等）は、web イメージを作り直す必要がある点に注意する（実行時に環境変数を変えても反映されない。[Dockerfile内のコメント](../../../apps/web/Dockerfile)参照）。
