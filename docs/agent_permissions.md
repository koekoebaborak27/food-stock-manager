# エージェント権限ポリシー（正本）

Claude Code / Codex / GitHub Copilot が**確認なしで実行してよいコマンド**・**毎回ユーザーへ確認を取るコマンド**・**実行してはならない操作**を定める。
ポリシーの正本はこのファイルのみ。各ツールの設定ファイルはこの表を機械可読な形へ写しただけの入口であり、**内容を変えるときはまずこのファイルを直す**。

判定は 3 段階。

| 判定 | 意味 | Claude Code | Copilot | Codex |
|---|---|---|---|---|
| 許可 | 確認なしで実行してよい | `permissions.allow` | `true` | `decision="allow"` |
| 確認 | 実行前に必ずユーザーへ聞く | `permissions.ask` | `false` | `decision="prompt"` |
| 禁止 | エージェントが単独で実行してはならない | `permissions.deny` | `false` | `decision="forbidden"` |

> Copilot は 2 値しか持たないため、「確認」と「禁止」はどちらも `false`（常に手動承認）になる。Copilot 上では**禁止は人間が確認画面で拒否して初めて成立する**。

## 許可（確認なしで実行してよい）

| 分類 | コマンド | 理由 |
|---|---|---|
| 依存 | `pnpm install` | ネットワークアクセスを伴うが、副作用は `node_modules/` に閉じる |
| 検証 | `pnpm lint` / `pnpm format` / `pnpm format:check` / `pnpm typecheck` | 読み取りか、整形のみ。整形結果は差分で確認できる |
| 検証 | `pnpm test` / `pnpm test:*` | 読み取りのみ（DB を破壊しない）。`pnpm test:e2e` もここに含む |
| ビルド | `pnpm build` | 生成物は成果物ディレクトリに閉じる |
| DB（生成物のみ） | `pnpm prisma:generate` | 型定義を作り直すだけで DB に触らない。Prisma を採用する場合 |
| Git（読み取り） | `git status` / `git diff` / `git log` / `git show` / `git branch` | 読み取りのみ |
| Git（手元だけを変える） | `git add` / `git commit` / `git checkout -b` / `git switch -c` | 変更はローカルに閉じ、やり直せる。リモートへ出す `git push` は「確認」側 |

## 確認（実行前に必ずユーザーへ聞く）

| 分類 | コマンド | 理由 |
|---|---|---|
| 依存 | `pnpm add` / `pnpm add -D` / `pnpm remove` | 依存関係が変わり、`package.json` と lock ファイルに残る |
| 任意コマンド実行 | `pnpm exec` / `pnpm dlx` / `npx` | 何でも実行できてしまい、許可・禁止の判定をすり抜ける入口になる |
| 常駐 | `pnpm dev` / `pnpm start` | 起動したまま終わらないため、勝手に走らせるとセッションが止まる |
| 画面テスト準備 | `pnpm exec playwright install` | ブラウザ本体を数百 MB ダウンロードする |
| Git（リモート） | `git push`（強制系を除く） | リモートの状態を変える。`main` への直接 push は `AGENTS.md` の最小規約に従う |
| GitHub | `gh pr create` など `gh` の書き込み操作 | 外部に見える形で内容が公開される |
| DB（スキーマ変更） | `prisma migrate dev` / `prisma db push` | 開発 DB のスキーマを書き換える。Prisma を採用する場合 |
| DB（リモート） | `supabase db push` / `supabase link` | リモートの Supabase プロジェクトへ適用・接続する |
| コンテナ | `docker build` / `docker push` | イメージを作り、レジストリへ送る |
| クラウド | `gcloud`（下の禁止に挙げたものを除く） | 本番プロジェクトに触れうる。個別に判断する |

## 禁止（エージェントが単独で実行してはならない）

| 対象 | 理由 |
|---|---|
| `.env` および `.env.*.local` の読み取り | 実クレデンシャルを含む。参照が必要なら `.env.example` を見る |
| `pnpm db:reset*` | 開発 DB を破壊する |
| `prisma migrate reset*` | マイグレーション履歴とデータを破壊する。`npx` / `pnpm exec` / `pnpm dlx` 経由も同じ |
| `supabase db reset*` | Supabase の DB を作り直す。`pnpm db:reset` と同じ破壊力 |
| `gcloud run deploy*` | 本番の Cloud Run サービスを差し替える |
| `gcloud run services delete*` | 本番の Cloud Run サービスを消す |
| `git push --force*` / `git push -f*` / `git push --force-with-lease*` | リモート履歴を破壊する |
| `git reset --hard*` | 未コミットの変更を破壊する |

上記に加えて、`AGENTS.md` の最小規約どおり **`main` への直接 push はドキュメント（`*.md` / `docs/`）のみ**、CI スキップ push は `docs/skills/push-skip-ci.md` に従いユーザー承認を得ること。

## ツールごとの適用先

| ツール | 設定ファイル | 強制の仕方 |
|---|---|---|
| Claude Code | `.claude/settings.json` | `permissions.allow` / `ask` / `deny` でコマンド単位に強制 |
| GitHub Copilot（VS Code Agent モード） | `.vscode/settings.json` の `chat.tools.terminal.autoApprove` | 正規表現ルール。`true` = 自動承認、`false` = 常に手動承認 |
| Codex CLI | `.codex/rules/project.rules`（コマンド単位）+ `.codex/config.toml`（面の制御） | execpolicy の `prefix_rule` で `allow` / `prompt` / `forbidden` をコマンド単位に強制。サンドボックスと承認ポリシーは `config.toml` 側 |

### 4 ファイルのずれを検出する

正本と 3 つの写しは手作業で同期するため放っておくとずれる。ずれを機械的に検出するために、次の 2 つを置いている。

- `tools/agent-permissions/policy.json` — このファイルの表を機械可読にしたもの。1 エントリが 1 行に対応し、「正本・Claude・Copilot・Codex のそれぞれに書かれているべき文字列」を持つ。
- `tools/agent-permissions/sync.test.ts` — `pnpm test` で走る。上の対応が 4 ファイルすべてに存在するかを検査し、あわせて `.vscode/settings.json` が JSON として壊れていないかも見る。

**表を 1 行足したら `policy.json` にも 1 エントリ足す。** 足し忘れは `pnpm test` が落ちて気付ける。

### Claude Code のパターン記法

`.claude/settings.json` のコマンド指定は 2 通り。

- `Bash(pnpm install)` — その文字列とちょうど一致するコマンドだけ。
- `Bash(pnpm test:*)` — `pnpm test` で始まるコマンド（前方一致）。**末尾は `:*` と書く。** 空白＋`*`（`git status *`）は前方一致の書き方ではないため使わない。

ファイル読み取りの禁止は `Read(.env)` のように書く。除外指定（「`.env.example` だけは許す」）は書けないため、**禁止したいファイルを 1 つずつ並べる**。

### Codex の execpolicy ルール

`.codex/rules/*.rules` は Codex が起動時に読み込むルールファイル（Starlark 風の構文）。

```python
prefix_rule(pattern=["git", "reset", "--hard"], decision="forbidden")
prefix_rule(pattern=["git", ["status", "diff", "log"]], decision="allow")
```

- `decision` は `"allow"`（確認なしで実行）/ `"prompt"`（常に確認）/ `"forbidden"`（実行拒否）の 3 値。`"deny"` は無効値で構文エラーになる。
- `pattern` はコマンドの**先頭トークン列（前方一致）**。要素にリストを書くと「そのいずれか」を意味する。
- **トークンは 1 つずつ厳密に一致する。** `["pnpm", "test"]` は `pnpm test:e2e` に一致しない（`test` と `test:e2e` は別のトークン）。サブコマンド付きの許可は 1 つずつ並べること。
- 読み込み先は 2 か所: `<repo>/.codex/rules/*.rules`（プロジェクト）と `~/.codex/rules/*.rules`（ユーザー）。**`.codex/config.toml` と違い、プロジェクトを trusted 承認していなくても読み込まれる。**
- `~/.codex/rules/default.rules` は Codex が「常に許可」を選んだときに自動で追記するファイル。手で編集してもよいが、リポジトリで共有されず Codex 自身が書き換えるため、**チーム共通のポリシーはプロジェクト側の `.codex/rules/` に置く。**
- 構文エラーがあると Codex は起動時に `Error loading rules` で停止する。効いているかは起動可否で確認できる。

### Copilot の正規表現の書き方

`.vscode/settings.json` は JSON であり、値は「正規表現を書いた文字列」である。**正規表現の `\` は JSON の中で `\\` と 2 つ重ねる。**

- `\\b`（単語の切れ目）を `\b` と書くと、JSON では「バックスペース文字」という別物になり、ルールが一致しなくなる。
- `\w` `\s` `\.` を 1 つの `\` で書くと JSON として不正になり、ファイル全体が読み込めなくなる。

正しい書き方は `"/^pnpm test(:[\\w:-]+)?\\b/": true` のように、すべての `\` を `\\` にすること。

### 注意点

- Copilot の `false` ルールは「常に確認を出す」であり、実行の禁止ではない。**確認された人間が拒否することで初めて禁止が成立する。**
- Codex はプロジェクト設定 `.codex/config.toml` を、そのプロジェクトを **trusted** として承認した場合のみ読み込む。初回起動時の信頼確認で承認していないと `sandbox_mode` / `approval_policy` は効かない（`.codex/rules/` は影響を受けない）。
- **前方一致で判定する仕組み（Claude Code / Codex）には共通の穴がある。**
  - フラグが後ろに回った形（`git push origin main --force`）は一致しない。
  - `pnpm exec` / `pnpm dlx` / `npx` を挟んだ形は、その組み合わせを個別に並べない限り一致しない。だからこれらは「確認」に置いている。
  - リダイレクト（`>`）・変数展開（`$(...)`）・ワイルドカードを含むコマンドは、Codex ではルール評価の対象外になる。
  - Windows では `pwsh -Command "<コマンド>"` の形で実行されることがあり、その場合トークン列が一致しない。
  - execpolicy はシェルコマンドのみを見るため、`.env` の読み取り禁止は組み込みのファイル読み取りツール経由では強制できない（ルールは `cat .env` 等のベストエフォート）。
- **広い「確認」と狭い「禁止」が重なるコマンドがある**（`gcloud` と `gcloud run deploy`、`git push` と `git push --force` など）。Claude Code は禁止が常に優先されるが、Codex はどちらが勝つかが実装依存のため、`.codex/rules/project.rules` では**禁止を先に、確認を最後に**並べてどちらの解釈でも安全側に倒れるようにしている。
- 3 ツールとも粒度が異なるため完全な等価にはならない。**強制力の弱いツールほど、この文書の禁止リストを規約として守ることが重要になる。**
