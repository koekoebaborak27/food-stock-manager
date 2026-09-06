# 画面側（Next.js）のイメージ。ビルドはリポジトリのルートをコンテキストにして実行する。
#   docker build -f apps/web/Dockerfile -t food-stock-manager-web .
#
# pnpm workspace（apps/web と apps/api の2パッケージ）の一部だけをビルドするため、
# 依存解決にはワークスペース全体のpackage.json / pnpm-lock.yamlが要る。
# 実行時は next.config.ts の output: "standalone" が生成する最小限のnode_modulesだけを使い、
# ビルドに使ったpnpmや他パッケージの依存は本番イメージへ持ち込まない。

FROM node:22-slim AS base
RUN corepack enable

# ---- 依存関係のインストールとビルド ----
FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_で始まる環境変数は、実行時ではなくこのビルド時にコード中へ
# 埋め込まれる（Next.jsの仕様）。実行時に変えても反映されないため、値を変えたら
# イメージを作り直す。
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

# next.config.tsの書き換え先（/api/*の転送先）もビルド時にoutput: "standalone"の
# 設定へ焼き込まれる。バックエンドの場所を変えたら、実行時のPORTと違い、
# こちらもイメージの作り直しが要る。ローカルでdocker runのみで動かす場合は
# ホスト側で起動したAPI（http://localhost:3001）を指す。
ARG API_BASE_URL="http://localhost:3001"
ENV API_BASE_URL=${API_BASE_URL}

RUN pnpm --filter web build

# ---- 実行用イメージ ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# apps/web/src/shared/api/server-fetch.tsはサーバーコンポーネントの実行時に
# process.env.API_BASE_URLを直接読む（rewritesと違いビルド時埋め込みではない）。
# ビルド用ステージのENVは実行用ステージに引き継がれないため、ここでも同じ値を設定する。
ARG API_BASE_URL="http://localhost:3001"
ENV API_BASE_URL=${API_BASE_URL}

# standalone出力はモノレポの構成をそのまま写すため、apps/web/配下にサーバー本体が入る。
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# 本番（Cloud Run）では実行環境からPORTが渡される。ローカルでは3000番を使う。
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
