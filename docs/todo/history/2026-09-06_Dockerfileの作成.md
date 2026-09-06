# Dockerfileの作成(タスク8)

- [2026-09-06 web/apiのDockerfileを作成し、docker build/runで動作確認した(タスク8)](#2026-09-06-webapiのdockerfileを作成しdocker-buildrunで動作確認したタスク8)

## 2026-09-06 web/apiのDockerfileを作成し、docker build/runで動作確認した(タスク8)

### やったこと

- `apps/api/Dockerfile`・`apps/web/Dockerfile`・リポジトリ直下の`.dockerignore`を新規作成した。
- 両イメージを`docker build`し、`docker run`で実際に起動、DBコンテナ(`docker/docker-compose.yml`)につないでAPIの疎通、webからのAPIリバースプロキシ(`/api/*`)の疎通まで確認した。

### 気づいた不具合と修正

- 作業前提として`pnpm --filter web build`(`next build`)を試したところ、既存コードで失敗した。CIの`pnpm build`は未導入(`.github/workflows/ci.yml`にコメントアウトで残っている)だったため、このタイミングまで検出されていなかった。
  - 原因: `apps/web/src/modules/account/ui/AccountSettingsForm.tsx`(クライアントコンポーネント)が、`auth`モジュールの入口`@/modules/auth`から`LogoutButton`を読み込んでいた。この入口は`server-only`を使う`getSession`も同時に公開しているため、Next.jsの本番ビルドが「クライアントコンポーネントからserver-onlyへ到達する経路」として検出しビルドを止めていた(devサーバーでは発生せず、本番ビルド時のみ検出される)。
  - 対処: `AccountSettingsForm.tsx`だけ、`LogoutButton`を`@/modules/auth/ui/LogoutButton`から直接読み込むよう変更した。`apps/web/AGENTS.md`の「モジュールの公開APIのみ使う」原則には反するが、バンドラーの制約によるやむを得ない例外として、インポート行にコメントで理由を残した。他に同様の入口経由インポートが無いことは`rg`で確認済み。

### Dockerfileの設計判断

- どちらもマルチステージビルドで、ビルドコンテキストはリポジトリ直下(`-f apps/<web|api>/Dockerfile .`で実行する。pnpm workspaceの依存解決にワークスペース全体の`package.json`/`pnpm-lock.yaml`が要るため)。
- **web**: `next.config.ts`の`output: "standalone"`をそのまま利用。ビルド後の`.next/standalone`はモノレポ構成を保ったまま出力される(サーバー本体は`apps/web/.next/standalone/apps/web/server.js`)ため、実行用イメージでは`standalone`・`.next/static`・`public`の3つだけをコピーすれば動く。
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`と、`next.config.ts`がAPIの転送先解決に使う`API_BASE_URL`は、どちらも**ビルド時に埋め込まれる**(実行時に環境変数を変えても反映されない)。実際に`API_BASE_URL`を変えて2回ビルドし、`required-server-files.json`の書き換え先が変わることを確認した。バックエンドの場所を変えたら画面側イメージの作り直しが要る、という制約はタスク9(Cloud Runデプロイ)で踏まえる必要がある。
- **api**: NestJSにはstandalone相当の仕組みが無いため、`pnpm prune --prod`でdevDependenciesを落とした上で、pnpmがワークスペース内をシンボリックリンクでつなぐ構造を保ったまま(ルートの`node_modules`と`apps/api/node_modules`を両方、位置関係を保って)実行用イメージへコピーする方式にした。
  - Prismaクライアントは**コンテナの中で`prisma generate`し直す**(ホストで生成した物を使うと、OSが異なる場合にエンジンバイナリが合わない)。
  - `node:22-slim`にはOpenSSLが入っておらず、無いと`prisma generate`がエンジンのバイナリ判定を誤り警告が出る(実行時の読み込み失敗につながる)。Prisma自身の警告に従い、`apt-get install openssl`を追加して解消した。

### 動作確認の方法

```bash
docker build -f apps/api/Dockerfile -t food-stock-manager-api .
docker build -f apps/web/Dockerfile -t food-stock-manager-web --build-arg API_BASE_URL=http://<apiコンテナ名>:3001 .
docker compose -f docker/docker-compose.yml up -d db
docker run -d --name <api> --network food-stock-manager_default -e DATABASE_URL=postgresql://app:password@db:5432/app_db -e GOOGLE_CLIENT_ID=dummy -e GOOGLE_CLIENT_SECRET=dummy -e GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback -e WEB_BASE_URL=http://localhost:3000 -e VAPID_PUBLIC_KEY=dummy -e VAPID_PRIVATE_KEY=dummy -e VAPID_SUBJECT=mailto:example@example.com -e INTERNAL_NOTIFICATION_SECRET=dummy -p 3001:3001 food-stock-manager-api
docker run -d --name <web> --network food-stock-manager_default -p 3000:3000 food-stock-manager-web
```

`http://localhost:3001/`(200)・`http://localhost:3001/api/auth/session`(401、未ログインとして正しい)・`http://localhost:3000/login`(200)・`http://localhost:3000/api/auth/session`(401、webからのリバースプロキシ経由でも同じ結果)を確認した。確認後は`docker rm -f`でテスト用コンテナを削除済み(イメージは残している)。

Googleログイン等の値はダミーで起動できる(実際に使う経路まで通していないため)。実際の疎通確認(ログイン等)はタスク9のデプロイ後、もしくは別途必要になった時点で行う。
