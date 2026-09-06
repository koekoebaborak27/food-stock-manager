# API側（NestJS）のイメージ。ビルドはリポジトリのルートをコンテキストにして実行する。
#   docker build -f apps/api/Dockerfile -t food-stock-manager-api .
#
# pnpm workspace（apps/web と apps/api の2パッケージ）の一部だけをビルドするため、
# 依存解決にはワークスペース全体のpackage.json / pnpm-lock.yamlが要る。
# Prismaが生成するクライアント（node_modules/.prisma）はこのコンテナの中で
# 生成したものだけを使う（ホストで生成した物をコピーすると、OSが違う場合に
# 動かないエンジンバイナリが混ざる）。

FROM node:22-slim AS base
RUN corepack enable
# node:22-slimにはopensslが入っておらず、無いとPrismaが生成するエンジンの
# バイナリ判定を誤り、実行時に読み込みへ失敗する(Prisma自身の警告に従う)。
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# ---- 依存関係のインストールとビルド ----
FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# schema.prismaはリポジトリ直下（apps/api配下ではない）にあるため、ルートの
# prisma:generateを使う。DATABASE_URLの実値は要らない（生成のみで接続はしない）。
RUN pnpm prisma:generate
RUN pnpm --filter api build
# devDependencies（@nestjs/cli等）を落とし、実行に要るものだけ残す。
RUN pnpm prune --prod

# ---- 実行用イメージ ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# pnpmはワークスペース内のパッケージ間をシンボリックリンクでつなぐため、
# ルートのnode_modulesとapps/api/node_modulesを両方、位置関係を保ったままコピーする。
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/package.json ./package.json

# 本番（Cloud Run）では実行環境からPORTが渡される。ローカルでは3001番を使う。
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
