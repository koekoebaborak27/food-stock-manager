# はじめての方へ（かんたん版）

このフォルダは、**「おうちde常備食」**（家で作った作り置きと食品ストックを家族で共有するスマホ向けアプリ）を作るためのものです。
いまは**要件定義まで終わり、アプリの中身はこれから**という段階です。

あわせて、**AI（Claude Code / Codex / GitHub Copilot）と一緒に開発するための決まりごと**が最初から入っています。
詳しい説明は [`README.md`](README.md) にあります。ここでは最初に知っておくことだけを案内します。

## AI 向けの決まりごとは、どうなっている？

3 つの AI ツールは、それぞれ別の場所に「指示書」を置く決まりになっています。
そのままだと同じルールを 3 回書くことになり、片方だけ古くなります。

このフォルダでは、**ルールを 1 か所（`AGENTS.md`）にまとめ、各 AI の指示書からはそこを読ませるだけ**にしてあります。
だから、ルールを直すときは 1 か所だけ直せば済みます。

同じ考え方で、次の 2 つも 1 か所にまとめてあります。

- **作業手順**（例:「TODO を更新して」と頼んだときの進め方）→ `docs/skills/` の中
- **AI に実行を許すコマンド / 禁止するコマンド** → `docs/agent_permissions.md`

## まず動くことを確かめる

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test
```

すべて通れば準備完了です。いまはサンプル（`apps/web/src/example/`）の 4 件と、AI に許可・禁止したコマンドの設定が 4 ファイルでずれていないかを見るテスト（`tools/agent-permissions/`）が走ります。サンプルは本物のコードを書き始めるときに消してかまいませんが、`tools/` は残してください。

画面と API は別々のサーバーなので、動かすときは**ターミナルを 2 つ開いて** `pnpm dev:web` と `pnpm dev:api` をそれぞれ実行します。VS Code で 1 行ずつ止めながら動かす方法は [`README.md`](README.md#vs-code-で-1-行ずつ止めながら動かす) にあります。

`apps/api` を動かすにはローカルDBと`.env`の設定が要ります。手順は [`README.md`](README.md#よく使うコマンド) を見てください。

## よく使うコマンド

```
pnpm install        # 必要な部品をそろえる
pnpm dev:web        # 画面を起動する。3000 番
pnpm dev:api        # API を起動する。3001 番
pnpm lint           # 書き方のチェック
pnpm typecheck      # 型のチェック
pnpm test           # テストの実行
```

## 困ったときは

| 知りたいこと | 見る場所 |
|---|---|
| このアプリの概要・各 AI での使い方 | [`README.md`](README.md) |
| どんなアプリを作るのか（要件） | [`docs/specs/01_requirements/`](docs/specs/01_requirements/README.md) |
| Git の使い方（変更を反映する手順） | [`docs/development/gitの操作ルール.md`](docs/development/gitの操作ルール.md) |
| AI に何を許可しているか | [`docs/agent_permissions.md`](docs/agent_permissions.md) |
| いま何が残っているか | [`docs/todo/TODO.md`](docs/todo/TODO.md) |
