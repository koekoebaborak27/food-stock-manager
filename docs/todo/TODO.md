# TODO

おうちde常備食 の**残タスクと現在地**。

**このファイルには「いま何が残っているか」だけを書く。** 設計・手順・経緯は下表の担当ファイルへ書き、ここからはリンクするだけにする。同じ内容を 2 か所に置かない。**150 行を超えたら、抱え込んでいる内容を担当ファイルへ移す。**

| 書きたいこと | 書く場所 |
| --- | --- |
| **残タスク・進捗・次の一手** | **このファイル** |
| 要件・設計・仕様の決定 | [`docs/specs/`](../specs/README.md) |
| 本番構築の手順・本番構成・環境変数 | [`docs/specs/99_infra/`](../specs/99_infra/README.md) |
| 設定値・落とし穴・実測値 | [`docs/todo/notes/`](notes/README.md) |
| 何をやったか・なぜ・どこで詰まったか | [`docs/todo/history/`](history/README.md)（古い順。新しい記録は末尾へ） |
| 開発フロー | [`docs/development/gitの操作ルール.md`](../development/gitの操作ルール.md) |
| 初めて触る人が必要とする情報 | [`README.md`](../../README.md) |

このファイルの更新手順は [`docs/skills/update-todo.md`](../skills/update-todo.md)（`/update-todo` の正本）。

## 進捗サマリ

**進捗を書くのはこの表だけ。** 他の節に「N / M 完了」を重ねて書かない。

| 区分 | 進捗 |
| --- | --- |
| 要件定義 | 5 / 5 |
| 基本設計 | 6 / 6 |
| 実装 | 2 / 2 |
| インフラ構築 | 0 / 2 |

## 次にやること

**次のセッションが最初に打つコマンドまで具体的に書く。**

```powershell
git log --oneline -1     # 現在のコミット
git status --porcelain   # 未コミット差分がないか確認
git switch main          # タスク7b・7cのPRがマージ済みならmainへ戻る
git pull                 # マージ結果を取り込む
pnpm install             # 依存を最新にそろえる
pnpm prisma:generate     # Prisma Client を生成（clone直後・スキーマ変更後に必要）
docker compose -f docker/docker-compose.yml up -d db   # ローカルDBを起動
```

タスク7cまで実装済み。タスク7bのバックエンドAPI（`feat/household-management`）とフロントエンド5画面（`feat/household-screens`）、それらの上に積んだタスク7cのPRを順にマージすること。マージ後、次はタスク7d（常備食管理）に着手する。`.env`にGoogle OAuthのクライアントID・シークレットが未設定の場合は`.env.example`を見て設定する。

- [x] **1. 画面遷移図を作る**（2026-09-05）→ [履歴](history/2026-09-05_画面遷移図の作成.md)
- [x] **2. 未決事項を決める**（2026-09-05）→ [履歴](history/2026-09-05_未決事項の決定.md)
- [x] **3. 全機能に共通する基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_共通の基本設計.md)
- [x] **4. 認証と家族グループの基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_認証と家族グループの基本設計.md)
- [x] **5a. 常備食管理の基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_常備食管理の基本設計.md)
- [x] **5b. 買い物リストの基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_常備食管理の基本設計.md#2026-09-05-買い物リストの設計を補完した)
- [x] **5c. `40_期限通知` の基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_期限通知の基本設計.md)
- [x] **6. 開発環境の土台を作る**（2026-09-05）→ [履歴](history/2026-09-05_開発環境の構築.md)・[落とし穴](notes/開発環境.md)
      当初は `package.json` へ依存を足すだけの予定だったが、Next.js と NestJS の要求が衝突したため pnpm workspace で `apps/web` / `apps/api` に分けた。
- [ ] 7. 機能を実装する。基本設計にもとづき、必要な機能は先に [`docs/specs/03_detail-design/`](../specs/03_detail-design/README.md) を書く。1機能でも画面・API数が多い場合はPRをさらに段階分割する。
  - [x] 7a. 認証と家族グループ: Googleログイン・セッションCookie・ログイン状態確認API（2026-09-05）→ [履歴](history/2026-09-05_ログイン基盤の実装.md)
  - [x] 7b. 認証と家族グループ: 家族グループの作成・参加・一覧・脱退・除名・削除・招待コード発行（2026-09-05）→ [履歴](history/2026-09-05_家族グループ機能の実装.md)
  - [x] 7c. 認証と家族グループ: アカウント設定（表示名変更・退会）（2026-09-05）→ [履歴](history/2026-09-05_アカウント設定の実装.md)
  - [ ] 7d以降. 常備食管理→買い物リスト→期限通知（基本設計の並び順）
- [ ] 8. Dockerfile を web / api の 2 つ書き、ローカルで `docker build` → `docker run` が通ることを確認する。手順が確定するのはタスク 7 の後。
- [ ] 9. Cloud Run へデプロイする。あわせて未決事項（最小インスタンス数を 0 のままとするか）を決める。

## 残っているタスク

いずれも**期限のない宿題**。判断材料は各リンク先にまとめる。

- [ ] 将来拡張の候補（[`01_プロダクト共通.md` の 9 節](../specs/01_requirements/00_共通/01_プロダクト共通.md)）は、初期版の利用後に優先度を見直す。

## 現在の状態

事実のみ。予定・経緯・仕様は書かない。

| 項目 | 状態 |
| --- | --- |
| 作業ブランチ | `codex/task-7c-account-settings`（タスク7c。`feat/household-screens`〈タスク7bフロントエンドPR〉の上に積んだスタックPRであり、さらにその下に`feat/household-management`〈タスク7bバックエンドPR〉がある） |
| ローカル環境 | 構築済み（`pnpm install` 実行済み。`pnpm lint` / `format:check` / `typecheck` / `test` が通る）。`pnpm dev:web` で画面（3000 番）、`pnpm dev:api` で API（3001 番）が起動する。DBは`docker compose -f docker/docker-compose.yml up -d db`でローカルPostgresを起動して使う |
| 本番 | 未構築 |
| 要件定義 | 完了（[`docs/specs/01_requirements/`](../specs/01_requirements/README.md)）。残る未決事項 3 件はインフラ構築時と初期版の利用後に決める |
| 基本設計 | [画面遷移図](../specs/02_basic-design/画面遷移図.md)・[全機能に共通する設計](../specs/02_basic-design/00_共通/README.md)・[認証と家族グループ](../specs/02_basic-design/10_認証と家族グループ/README.md)・[常備食管理](../specs/02_basic-design/20_常備食管理/README.md)・[買い物リスト](../specs/02_basic-design/30_買い物リスト/README.md)・[期限通知](../specs/02_basic-design/40_期限通知/README.md) まで完了 |
| 実装 | タスク7a〜7c完了（7b・7cのPRは`main`未マージ）。`apps/api`にGoogleログイン・セッションCookie・`GET /api/auth/session`（`userId` `email`を含む）・家族グループ7経路・表示名変更と退会の2経路がある。DBは`prisma/schema.prisma`に`User` `Household` `Membership` `Invitation` `Session`の5テーブル。`apps/web`はログイン画面・ログイン中判定の振り分け（`src/proxy.ts`）に加え、家族グループの選択・作成・参加・メンバー一覧・招待コード発行の5画面とアカウント設定画面が動く。ヘッダーのメニュー（通知の設定・アカウントの設定への導線）と下部タブは常備食一覧が未実装のため未着手。常備食管理以降の機能は未着手 |
| 詳細設計 | [`10_認証と家族グループ/01_セッション設計.md`](../specs/03_detail-design/10_認証と家族グループ/01_セッション設計.md)・[`02_家族グループの状態遷移.md`](../specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md)まで着手。他は未着手（[`docs/specs/03_detail-design/`](../specs/03_detail-design/README.md)。必要な機能のみ書く方針） |

## 完了済みの作業

各区分の実施内容・判断・詰まった点は [`docs/todo/history/`](history/README.md) にセッション単位で残す。

| 区分 | 件数 | 記録 |
| --- | --- | --- |
| 要件定義 | 1 | [2026-09-04_要件定義の合意.md](history/2026-09-04_要件定義の合意.md) |
| 開発環境 | 2 | [2026-09-04_エージェント権限ポリシーの整合.md](history/2026-09-04_エージェント権限ポリシーの整合.md)・[2026-09-05_開発環境の構築.md](history/2026-09-05_開発環境の構築.md) |
