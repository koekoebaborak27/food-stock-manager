# DB（Prisma・ローカルPostgres）の落とし穴と設定値

Prisma・ローカルPostgres（Docker）まわりでつまずいた点を、そのまま打ち直せる形で残す。

## 目次

- [2026-09-05 Prisma7では datasource の url が使えない](#2026-09-05-prisma7では-datasource-の-url-が使えない)
- [2026-09-05 モノレポでは@prisma/clientを使うパッケージにもprisma CLIを入れる](#2026-09-05-モノレポではprismaclientを使うパッケージにもprisma-cliを入れる)
- [2026-09-05 docker-composeにはnameを明示する](#2026-09-05-docker-composeにはnameを明示する)

## 2026-09-05 Prisma7では datasource の url が使えない

`pnpm add -w -D prisma`（バージョン指定なし）は`latest`タグの`8.0.0-rc.13`（RC）を入れてしまう。安定版を明示する。

```powershell
pnpm add -w -D prisma@6.19.3
pnpm --filter api add @prisma/client@6.19.3
```

7系（`7.10.0`）を試すと、`schema.prisma`の`datasource`に`url = env("DATABASE_URL")`と書いた時点で次のエラーになる。

```
error: The datasource property `url` is no longer supported in schema files.
```

Prisma 7から接続情報は`prisma.config.ts`側へ移し、`PrismaClient`にはドライバアダプタ（`adapter`）を渡す方式に変わった。`prisma/AGENTS.md`が前提にしている旧来の方式（`schema.prisma`に`url`を書く）を保つ間は、6系に固定する。

## 2026-09-05 モノレポではPrisma Clientを使うパッケージにもprisma CLIを入れる

`prisma`をルートだけの開発依存にし、`@prisma/client`をアプリ側（例: `apps/api`）にだけ入れると、`pnpm prisma:generate`は成功と表示されるのに、そのアプリの`tsc`が次で失敗することがある。

```
error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'.
```

pnpmは`@prisma/client`のpeer依存（`prisma`）が解決するバージョンごとに、内容アドレスで別の複製を作る。ルートから`prisma generate`を実行すると、ルートの`prisma`をpeerとして解決した複製に生成物が書き込まれるが、アプリ側の`@prisma/client`は別のpeer解決結果（別ハッシュ）の複製を指していることがあり、生成物が見えない。

対処: `@prisma/client`を使うアプリ自身にも同じバージョンの`prisma`を入れる。

```powershell
pnpm --filter api add -D prisma@6.19.3
pnpm install
pnpm prisma:generate
```

解消したかどうかは、シンボリックリンクの指す先と実際に生成された場所のハッシュが一致しているかで確認できる。

```powershell
readlink -f apps/api/node_modules/@prisma/client   # このハッシュと
pnpm prisma:generate                                # ここで表示されるハッシュが一致していればOK
```

## 2026-09-05 docker-composeにはnameを明示する

`docker-compose.yml`に`name:`を書かないと、Composeは**ファイルを置いたディレクトリ名**をプロジェクト名にする。`docker/docker-compose.yml`のように、複数のプロジェクトが同じような配置（`docker/`フォルダ）を使っていると、コンテナ名・ボリューム名（例: `docker_db-data`）が衝突し、**別プロジェクトのDBボリュームをそのまま使い回してしまう**。

実際に、無関係な別プロジェクトの8日前のデータが入ったボリュームをマウントしてしまい、Prismaが差分を検出して`migrate reset`（全消去）を促す事態になった（実行はしていない）。

```yaml
# docker/docker-compose.yml
name: food-stock-manager # ← 必ず明示する
services:
  db:
    image: postgres:16
    # ...
```

もし衝突に気づいたら、**`migrate reset`は実行せず**にコンテナだけ止め、`name`を直してから作り直す。

```powershell
docker compose -f docker/docker-compose.yml down   # -v は付けない（ボリュームを残す）
# name を直した後
docker compose -f docker/docker-compose.yml up -d db
```
