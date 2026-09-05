# おうちde常備食

家庭で作った作り置き料理と、冷蔵・冷凍・常温の食品ストックを**家族で共有する**スマホ向け PWA です。食べ忘れと重複購入を減らすことを目的としています。

- **常備食一覧** — 保存場所ごとに切り替え、期限が近い順に表示。一覧から残数を増減できます。
- **買い物リスト** — 切らした食品をその場で追加。買ってきたら常備食へ戻せます。
- **期限通知** — 期限が近い食品を 1 日 1 回まとめてお知らせします。

家族は「家族グループ（世帯）」に集まり、常備食と買い物リストを共有します。ログインは Google アカウントのみです。

## 状況

**要件定義と基本設計が完了し、Googleログイン・セッション、家族グループ機能、アカウント設定（表示名変更・退会）、常備食のデータベースと一覧取得APIまで実装しました（タスク7b〜7d-1のスタックPRは`main`未マージ）。常備食の画面と登録・編集以降の機能はこれからです。**

| 種類 | 場所 |
|---|---|
| 要件定義書 | [`docs/specs/01_requirements/`](docs/specs/01_requirements/README.md) |
| 基本設計書 | [`docs/specs/02_basic-design/`](docs/specs/02_basic-design/README.md) |
| 決定の経緯 | [`docs/todo/history/`](docs/todo/history/README.md) |
| 残タスク・現在地 | [`docs/todo/TODO.md`](docs/todo/TODO.md) |

## 技術構成

| 区分 | 採用 |
|---|---|
| フロントエンド | Next.js + TypeScript（PWA） |
| バックエンド | NestJS + TypeScript |
| 実行基盤 | Google Cloud Run |
| データベース | Supabase PostgreSQL |
| 認証 | Google ログイン |
| 通知の配信 | Cloud Scheduler + Cloud Run + Web Push（VAPID 鍵） |

画面と API は pnpm workspace で別々のパッケージに分けています。求める設定が食い違う（画面側は ESM、API 側は CommonJS で動かす）ためです。

| パッケージ | 中身 |
|---|---|
| [`apps/web/`](apps/web/AGENTS.md) | 画面（Next.js）。3000 番で起動 |
| `apps/api/` | API（NestJS）。3001 番で起動 |

---

以下は、このリポジトリが使っている「AI 向けルールの置き方」の説明です。ベースにした AI 開発テンプレート（[ai-dev-template](https://github.com/koekoebaborak27/ai-dev-template)）由来の仕組みで、このプロジェクトでもそのまま使っています。テンプレートから新しいプロジェクトを作る手順は [`docs/development/本テンプレートPJをコピーする方法.md`](docs/development/本テンプレートPJをコピーする方法.md) にまとめてあります（このプロジェクトでは実施済み）。

## 全体の構造

```
各AI専用の入口        CLAUDE.md / .github/copilot-instructions.md /（Codex は AGENTS.md を直読み）
        ↓
共通ルール            AGENTS.md（正本）+ DESIGN.md / REVIEW.md / TESTING.md / apps/web/AGENTS.md
        ↓
共通スキル            docs/skills/<name>.md（正本）
                        └ 入口: .claude/skills/ · .agents/skills/ · .github/prompts/
        ↓
権限ポリシー          docs/agent_permissions.md（正本）
                        ├ 写し: .claude/settings.json · .vscode/settings.json · .codex/rules/
                        └ ずれ検出: tools/agent-permissions/（pnpm test で一緒に走る）
        ↓
プロジェクト固有      docs/specs/（要件・設計）· docs/todo/（残タスク・履歴）
```

## 各 AI での使い方

### Claude Code

- 起動すると [`CLAUDE.md`](CLAUDE.md) が読まれ、そこから [`AGENTS.md`](AGENTS.md) が読み込まれます。
- スキルは `/update-todo` のようにスラッシュコマンドで起動するか、説明文に合う依頼をすると自動で起動します。
- サブエージェント（`.claude/agents/`）は「試行錯誤を本体の会話に残さない」用途で使います。`@agent-create-vitest-test` のように指定できます。
- 権限は `.claude/settings.json` の `allow` / `deny` で強制されます。

### Codex

- 専用の入口ファイルはありません。**`AGENTS.md` を直接読みます。**
- スキルは `.agents/skills/<name>/SKILL.md` の説明文に合う依頼をすると起動します。
- 禁止コマンドは `.codex/rules/project.rules`（execpolicy）で強制されます。サンドボックスと承認ポリシーは `.codex/config.toml` ですが、**プロジェクトを trusted として承認していないと読み込まれません**。

### GitHub Copilot（VS Code のエージェントモード）

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) が自動で読まれ、そこから `AGENTS.md` へ誘導します。
- スキルは Copilot Chat で `/update-todo` のように起動します（`.github/prompts/`。`chat.promptFiles` が有効である必要があります）。
- カスタムエージェントは `.github/agents/`。チャット上部のドロップダウンから選びます。
- ターミナルの自動承認は `.vscode/settings.json` の `chat.tools.terminal.autoApprove`。**`false` は「禁止」ではなく「毎回確認する」**です。

## どこに何を書くか

| 書きたいこと | 書く場所 |
|---|---|
| 3 ツール共通のルール・方針 | [`AGENTS.md`](AGENTS.md)（**正本**） |
| そのツールでしか意味がない補足 | `CLAUDE.md` / `.github/copilot-instructions.md` の「〜固有」節 |
| UI / デザイン規約 | [`DESIGN.md`](DESIGN.md) |
| コミット / PR のレビュー観点 | [`REVIEW.md`](REVIEW.md) |
| テストの書き方 | [`TESTING.md`](TESTING.md) |
| `src/` の構造・依存方向 | [`apps/web/AGENTS.md`](apps/web/AGENTS.md) |
| 許可・禁止コマンド | [`docs/agent_permissions.md`](docs/agent_permissions.md)（**正本**。3 つの設定ファイルへ写す） |
| 繰り返す作業の手順 | [`docs/skills/<name>.md`](docs/skills/README.md)（**正本**。入口 3 つは薄いまま） |
| 要件・設計 | [`docs/specs/`](docs/specs/README.md) |
| 残タスク・履歴 | [`docs/todo/`](docs/todo/TODO.md) |

**同じルールを 2 か所に書かないこと。** 迷ったら `AGENTS.md` に書き、他からはリンクします。

## スキルを追加する

手順は [`docs/skills/README.md`](docs/skills/README.md)「新しいスキルを追加する手順」にあります。要点は 2 つだけです。

1. 手順の正本は `docs/skills/<name>.md` に **1 つだけ**置く。
2. 3 ツールの入口（`.claude/skills/` / `.agents/skills/` / `.github/prompts/`）は、その正本を読ませる 3〜5 行にとどめる。

## 同梱しているスキル

| スキル | 何をするか |
|---|---|
| `update-todo` | `docs/todo/TODO.md` を最新化し、影響があれば README も直す |
| `push-skip-ci` | CI を起動させずに push する（実行前に必ずユーザーの承認を取る） |
| `create-unit-test-spec` | 単体テスト仕様書を Markdown で作る |
| `create-vitest-test` | Vitest の単体テストを書き、`pnpm test` が通るまで直す |
| `playwright-evidence-test` | 仕様書どおりに画面を操作し、スクリーンショットと DB 状態をエビデンスとして残す |

## よく使うコマンド

```
pnpm install        # 依存パッケージの取得
pnpm dev:web        # 画面（Next.js）を開発モードで起動。3000 番
pnpm dev:api        # API（NestJS）を開発モードで起動。3001 番
pnpm build          # web と api の両方をビルド
pnpm lint           # ESLint
pnpm format         # Prettier で整形
pnpm format:check   # Prettier チェック
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest（単体）
pnpm test:e2e       # Playwright（画面操作）
pnpm prisma:generate # Prisma Client を生成（clone直後・スキーマ変更後に必要）
pnpm prisma:migrate  # マイグレーションを作成してローカルDBへ適用
pnpm prisma:seed     # 初期データを投入する
pnpm db:reset        # ローカルDBを作り直す（要確認。データが消える）
```

画面と API は別々のサーバーなので、**ターミナルを 2 つ開いて `pnpm dev:web` と `pnpm dev:api` をそれぞれ実行**します。片方のパッケージだけを対象にしたいときは `pnpm --filter web <コマンド>` / `pnpm --filter api <コマンド>` を使います。

`apps/api` はDBに接続します。`docker compose -f docker/docker-compose.yml up -d db` でローカルPostgresを起動し、`.env`（[`.env.example`](.env.example)を写して作る）に`DATABASE_URL`とGoogleログイン用の`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`を設定してから動かします。

依存パッケージを足すときは、入れる先を間違えないよう `--filter` で指定します。詳しくは [`docs/todo/notes/開発環境.md`](docs/todo/notes/開発環境.md)。

```
pnpm --filter web add <パッケージ名>     # 画面側だけで使うもの
pnpm --filter api add <パッケージ名>     # API 側だけで使うもの
pnpm add -D -w <パッケージ名>            # 両方で使う開発ツール
```

## VS Code で 1 行ずつ止めながら動かす

左サイドバーの**実行とデバッグ**から、次のいずれかを選んで起動します（設定は [`.vscode/launch.json`](.vscode/launch.json)）。

| 選ぶもの | 何が起きるか |
|---|---|
| web と api を同時に動かす | 画面と API の両方が、途中で止められる状態で起動する |
| api（NestJS）を止めながら動かす | API だけ起動する |
| web（Next.js）のサーバー側を止めながら動かす | 画面のうち、サーバー側で動く処理だけ止められる |
| web（Next.js）のブラウザ側を止めながら動かす | Chrome が開き、ブラウザ上で動く処理を止められる |

止めたい行の**行番号の左側をクリック**すると赤い丸（ブレークポイント）が付き、そこまで処理が進むと止まって変数の中身を見られます。

## ライセンス

MIT（[`LICENSE`](LICENSE)）。コピーして自由に使ってください。
