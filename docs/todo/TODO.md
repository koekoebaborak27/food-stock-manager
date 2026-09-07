# TODO

おうちde常備食 の**残タスクと現在地**。

**このファイルには「いま何が残っているか」だけを書く。** 設計・手順・経緯は下表の担当ファイルへ書き、ここからはリンクするだけにする。同じ内容を 2 か所に置かない。**150 行を超えたら、抱え込んでいる内容を担当ファイルへ移す。**

| 書きたいこと             | 書く場所                                                           |
| ------------------ | -------------------------------------------------------------- |
| **残タスク・進捗・次の一手**   | **このファイル**                                                     |
| 要件・設計・仕様の決定        | [`docs/specs/`](../specs/README.md)                            |
| 本番構築の手順・本番構成・環境変数  | [`docs/specs/99_infra/`](../specs/99_infra/README.md)          |
| 設定値・落とし穴・実測値       | [`docs/todo/notes/`](notes/README.md)                          |
| 何をやったか・なぜ・どこで詰まったか | [`docs/todo/history/`](history/README.md)（古い順。新しい記録は末尾へ）       |
| 開発フロー              | [`docs/development/gitの操作ルール.md`](../development/gitの操作ルール.md) |
| 初めて触る人が必要とする情報     | [`README.md`](../../README.md)                                 |

このファイルの更新手順は [`docs/skills/update-todo.md`](../skills/update-todo.md)（`/update-todo` の正本）。

## 進捗サマリ

**進捗を書くのはこの表だけ。** 他の節に「N / M 完了」を重ねて書かない。

| 区分 | 進捗 |
| --- | --- |
| 要件定義 | 5 / 5 |
| 基本設計 | 6 / 6 |
| 実装 | 6 / 6 |
| インフラ構築 | 2 / 2 |

## 次にやること

**次のセッションが最初に打つコマンドまで具体的に書く。**

```powershell
git log --oneline -1     # 現在のコミット
git status --porcelain   # 未コミット差分がないか確認
git switch main          # mainにいなければ戻る
git pull                 # 最新のmainを取り込む
pnpm install             # 依存を最新にそろえる
pnpm prisma:generate     # Prisma Client を生成（clone直後・スキーマ変更後に必要）
docker compose -f docker/docker-compose.yml up -d db   # ローカルDBを起動
```

機能実装（タスク7）・タスク8（Dockerfile）・タスク9（Cloud Runへのデプロイ、Cloud Scheduler設定含む）はすべて完了済み（詳細は[履歴](history/2026-09-06_Cloud_Runへのデプロイ.md)・[履歴](history/2026-09-07_Cloud_Schedulerの設定.md)）。次はGitHub ActionsからCloud Runへの自動デプロイ（CI/CD、タスク10）に着手する。方針は[`infra_design_06_今後の課題.md`](../specs/99_infra/infra_design_06_今後の課題.md)の1節を参照。

- [x] **1. 画面遷移図を作る**（2026-09-05）→ [履歴](history/2026-09-05_画面遷移図の作成.md)
- [x] **2. 未決事項を決める**（2026-09-05）→ [履歴](history/2026-09-05_未決事項の決定.md)
- [x] **3. 全機能に共通する基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_共通の基本設計.md)
- [x] **4. 認証と家族グループの基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_認証と家族グループの基本設計.md)
- [x] **5a. 常備食管理の基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_常備食管理の基本設計.md)
- [x] **5b. 買い物リストの基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_常備食管理の基本設計.md#2026-09-05-買い物リストの設計を補完した)
- [x] **5c. `40_期限通知` の基本設計を書く**（2026-09-05）→ [履歴](history/2026-09-05_期限通知の基本設計.md)
- [x] **6. 開発環境の土台を作る**（2026-09-05）→ [履歴](history/2026-09-05_開発環境の構築.md)・[落とし穴](notes/開発環境.md)
      当初は `package.json` へ依存を足すだけの予定だったが、Next.js と NestJS の要求が衝突したため pnpm workspace で `apps/web` / `apps/api` に分けた。
- [x] 7. 機能を実装する。基本設計にもとづき、必要な機能は先に [`docs/specs/03_detail-design/`](../specs/03_detail-design/README.md) を書く。1機能でも画面・API数が多い場合はPRをさらに段階分割する。
  - [x] 7a. 認証と家族グループ: Googleログイン・セッションCookie・ログイン状態確認API（2026-09-05）→ [履歴](history/2026-09-05_ログイン基盤の実装.md)
  - [x] 7b. 認証と家族グループ: 家族グループの作成・参加・一覧・脱退・除名・削除・招待コード発行（2026-09-05）→ [履歴](history/2026-09-05_家族グループ機能の実装.md)
  - [x] 7c. 認証と家族グループ: アカウント設定（表示名変更・退会）（2026-09-05）→ [履歴](history/2026-09-05_アカウント設定の実装.md)
  - [x] 7d-1. 常備食管理: `Stock` のスキーマと一覧取得API（2026-09-05）→ [履歴](history/2026-09-05_アカウント設定の実装.md#2026-09-05-常備食一覧apiの土台を実装した)
  - [x] 7d-2. 常備食管理: 常備食リスト画面（2026-09-05）→ [履歴](history/2026-09-05_アカウント設定の実装.md#2026-09-05-常備食リスト画面を実装した)
  - [x] 7d-3. 常備食管理: 登録・編集のAPIと画面を実装する（2026-09-05）→ [履歴](history/2026-09-05_アカウント設定の実装.md#2026-09-05-常備食の登録編集を実装した)
  - [x] 7d-4. 常備食管理: 常備食の詳細画面と残数の増減・削除・消費済を実装する（買い物リストへの追加は30_買い物リストの実装後）（2026-09-06）→ [履歴](history/2026-09-05_アカウント設定の実装.md#2026-09-06-常備食の詳細画面残数増減削除消費済を実装した)
  - [x] 7d-5. 常備食管理: 消費済リスト画面と常備食へ戻すAPIを実装する（買い物リストへ追加する操作は30_買い物リストの実装後）（2026-09-06）→ [履歴](history/2026-09-05_アカウント設定の実装.md#2026-09-06-消費済リスト画面を実装した)
  - [x] 7e-1. 買い物リスト: `ShoppingItem`のスキーマと一覧取得API（`GET /api/shopping-items`）（2026-09-06）→ [履歴](history/2026-09-06_買い物リストの実装.md#2026-09-06-shoppingitemのスキーマと一覧取得apiを実装した7e-1)
  - [x] 7e-2. 買い物リスト: 買い物リスト画面（一覧表示・未購入/購入済みの開閉・空表示）（2026-09-06）→ [履歴](history/2026-09-06_買い物リストの実装.md#2026-09-06-買い物リスト画面の一覧表示を実装した7e-2)
  - [x] 7e-3. 買い物リスト: 直接入力・常備食からの追加API/画面（重複判定を含む。常備食側の追加ボタンはこの後）（2026-09-06）→ [履歴](history/2026-09-06_買い物リストの実装.md#2026-09-06-直接入力常備食からの追加を実装した7e-3)
  - [x] 7e-4. 買い物リスト: 購入状態変更API・購入確認シート（[詳細設計: 購入時の常備食反映](../specs/03_detail-design/30_買い物リスト/01_購入時の常備食反映.md)を実装）（2026-09-06）→ [履歴](history/2026-09-06_買い物リストの実装.md#2026-09-06-購入状態変更を実装した7e-4)
  - [x] 7e-5. 買い物リスト: 削除・一括削除・復元のAPI・画面（[詳細設計: 重複判定と一括操作の整合性](../specs/03_detail-design/30_買い物リスト/02_重複判定と一括操作の整合性.md)の一括部分を実装）（2026-09-06）→ [履歴](history/2026-09-06_買い物リストの実装.md#2026-09-06-削除一括削除復元を実装した7e-5)
  - [x] 7f-1. 期限通知: スキーマ(`PushSubscription` `NotificationSetting`)と通知時刻API(`GET/PATCH /api/notification-settings`)（2026-09-06）→ [履歴](history/2026-09-06_期限通知の実装.md#2026-09-06-スキーマと通知時刻apiを実装した7f-1)
  - [x] 7f-2. 期限通知: PWAの土台(`manifest.json`・Service Worker登録・VAPID鍵)と購読API(`GET /api/push-subscriptions/me`・`POST /api/push-subscriptions`・`DELETE /api/push-subscriptions/me`)（2026-09-06）→ [履歴](history/2026-09-06_期限通知の実装.md#2026-09-06-pwaの土台と購読apiを実装した7f-2)
  - [x] 7f-3. 期限通知: 通知の設定画面(通知トグル・通知時刻選択)（2026-09-06）→ [履歴](history/2026-09-06_期限通知の実装.md#2026-09-06-通知の設定画面を実装した7f-3)
  - [x] 7f-4. 期限通知: 配信バッチAPI(`POST /api/internal/notifications/dispatch`)を実装する（[詳細設計: Web Push配信処理](../specs/03_detail-design/40_期限通知/01_Web_Push配信処理.md)を先に書く）（2026-09-06）→ [履歴](history/2026-09-06_期限通知の実装.md#2026-09-06-配信バッチapiを実装した7f-4)
- [x] **8. Dockerfile を web / api の 2 つ書き、ローカルで `docker build` → `docker run` が通ることを確認する**（2026-09-06）→ [履歴](history/2026-09-06_Dockerfileの作成.md)
- [x] **9a. 未決事項（Cloud Runの最小インスタンス数・Supabaseのバックアップ）を決め、Cloud Runへのデプロイ手順書を書く**（2026-09-06）→ [履歴](history/2026-09-06_インフラ構築の準備.md)
- [x] **9b. GCPプロジェクト・Artifact Registry・Secret Manager・Cloud Run（api→web）を実際に構築し、ログイン〜常備食登録〜Supabase反映まで動作確認する**（2026-09-06）→ [履歴](history/2026-09-06_Cloud_Runへのデプロイ.md)
- [x] **9c. [`infra_design_05_Cloud_Scheduler.md`](../specs/99_infra/infra_design_05_Cloud_Scheduler.md)どおりに配信バッチの定期実行ジョブ（15分ごと）を作成し、実際にWeb Push通知が届くか確認する**（2026-09-07）→ [履歴](history/2026-09-07_Cloud_Schedulerの設定.md)
- [ ] 10. GitHub ActionsからCloud Runへの自動デプロイ（CI/CD）を設定する（[`infra_design_06_今後の課題.md`](../specs/99_infra/infra_design_06_今後の課題.md)。手動デプロイが安定して動くことを確認できたため着手してよい）。
- [ ] 11. アプリアイコンを[`アプリアイコン画像.png`](../specs/02_basic-design/99_デザインイメージ/アプリアイコン画像.png)に差し替える。`apps/web/public/icons/`配下の`icon-192.png` `icon-512.png` `icon-maskable-512.png` `apple-touch-icon.png`が対象（必要なサイズへのリサイズを含む）。

## 残っているタスク

いずれも**期限のない宿題**。判断材料は各リンク先にまとめる。

- [ ] 将来拡張の候補（[`01_プロダクト共通.md` の 9 節](../specs/01_requirements/00_共通/01_プロダクト共通.md)）は、初期版の利用後に優先度を見直す。

## 現在の状態

事実のみ。予定・経緯・仕様は書かない。

| 項目 | 状態 |
| --- | --- |
| 作業ブランチ | `main`（タスク7・8・9a・9b・#30・#31のPRはすべてマージ済み） |
| ローカル環境 | 構築済み（`pnpm install` 実行済み。`pnpm lint` / `format:check` / `typecheck` / `test` / `pnpm build` が通る）。`pnpm dev:web` で画面（3000 番）、`pnpm dev:api` で API（3001 番）が起動する。DBは`docker compose -f docker/docker-compose.yml up -d db`でローカルPostgresを起動して使う。ローカルの`.env`には`DIRECT_URL`も必要（`DATABASE_URL`と同じ値でよい） |
| 本番 | 構築済み（GCPプロジェクト`food-stock-manager-507709`、リージョン`asia-northeast1`）。web: `https://web-450943687130.asia-northeast1.run.app`、api: `https://api-450943687130.asia-northeast1.run.app`。DBはSupabase（Tokyo）、マイグレーション適用済み。ログイン〜常備食登録〜Supabase反映まで動作確認済み。Cloud Schedulerジョブ`notification-dispatch`（15分ごと）を作成し、Web Push通知の到達まで確認済み（詳細は[履歴](history/2026-09-06_Cloud_Runへのデプロイ.md)・[履歴](history/2026-09-07_Cloud_Schedulerの設定.md)）。デプロイ手順は[`docs/specs/99_infra/`](../specs/99_infra/README.md)。CI/CD（自動デプロイ）は未構築 |
| 要件定義 | 完了（[`docs/specs/01_requirements/`](../specs/01_requirements/README.md)）。残る未決事項は「単位の選択肢6種が実際の利用に足りるか」の1件のみ（初期版の利用後に決める） |
| 基本設計 | [画面遷移図](../specs/02_basic-design/画面遷移図.md)・[全機能に共通する設計](../specs/02_basic-design/00_共通/README.md)・[認証と家族グループ](../specs/02_basic-design/10_認証と家族グループ/README.md)・[常備食管理](../specs/02_basic-design/20_常備食管理/README.md)・[買い物リスト](../specs/02_basic-design/30_買い物リスト/README.md)・[期限通知](../specs/02_basic-design/40_期限通知/README.md) まで完了 |
| 実装 | タスク7a〜7c・7d-1〜7d-5・7e-1〜7e-5・7f-1〜7f-4すべて`main`マージ済み。機能実装（タスク7）が完了。`apps/api`にGoogleログイン・セッションCookie・家族グループ7経路・表示名変更と退会の2経路・常備食の一覧/1件取得/登録/編集（`GET/POST/PUT /api/stocks`、`GET /api/stocks/{id}`）・残数増減（`PATCH /api/stocks/{id}/quantity`）・消費済（`POST /api/stocks/{id}/consume`。200で`{duplicateShoppingItem}`を返す）・削除（`DELETE /api/stocks/{id}`）・削除の取り消し（`POST /api/stocks/{id}/restore`）・消費済リストの取得（`GET /api/stocks/consumed`）・常備食への再登録（`POST /api/stocks/{id}/re-register`）に加え、買い物リストの一覧取得・追加（`GET/POST /api/shopping-items`）・購入状態変更（`PATCH /api/shopping-items/{id}/purchased`。常備食への反映を含む）・1件削除（`DELETE /api/shopping-items/{id}`）・購入済み一括削除（`DELETE /api/shopping-items/purchased`）・復元（`POST /api/shopping-items/restore`）・期限通知の通知時刻API（`GET/PATCH /api/notification-settings`）・購読API（`GET/POST /api/push-subscriptions`・`DELETE /api/push-subscriptions/me`）・配信バッチ（`POST /api/internal/notifications/dispatch`。Cloud Schedulerからの`X-Internal-Secret`ヘッダーで認証し、通知時刻が一致し当日未配信の世帯を確保して`StockService.countUrgent`で件数を数え、`web-push`で配信。`apps/api/src/notification-dispatch/`）がある。`GET /api/stocks/{id}`応答には作成者・更新者名も含む。DBは`prisma/schema.prisma`に`User` `Household` `Membership` `Invitation` `Session` `Stock` `ShoppingItem` `PushSubscription` `NotificationSetting`の9テーブル。`apps/web`は家族グループ関連の5画面・アカウント設定画面、常備食リスト画面（`urgentOnly=true`のURL絞り込みに対応）・登録編集画面（`/stocks/new`・`/stocks/{id}/edit`）・詳細画面（`/stocks/{id}`、在庫切れシートから買い物リストへ追加可能）・消費済リスト画面（`/stocks/consumed`、買い物リストへ追加するボタン付き）・買い物リスト画面（`/shopping-list`、一覧表示・FABからの直接入力追加・購入確認シート付きのチェック操作・削除/一括削除/復元）・PWAの土台（`public/manifest.json` `sw.js` `icons/`）・通知の設定画面（`/notifications`、通知トグルと通知時刻選択を即保存）が動く。常備食リスト/詳細のカートアイコンからの追加は未着手 |
| 詳細設計 | [`10_認証と家族グループ/01_セッション設計.md`](../specs/03_detail-design/10_認証と家族グループ/01_セッション設計.md)・[`02_家族グループの状態遷移.md`](../specs/03_detail-design/10_認証と家族グループ/02_家族グループの状態遷移.md)、[`30_買い物リスト/01_購入時の常備食反映.md`](../specs/03_detail-design/30_買い物リスト/01_購入時の常備食反映.md)・[`02_重複判定と一括操作の整合性.md`](../specs/03_detail-design/30_買い物リスト/02_重複判定と一括操作の整合性.md)、[`40_期限通知/01_Web_Push配信処理.md`](../specs/03_detail-design/40_期限通知/01_Web_Push配信処理.md)まで着手。他は未着手（[`docs/specs/03_detail-design/`](../specs/03_detail-design/README.md)。必要な機能のみ書く方針） |

## 完了済みの作業

各区分の実施内容・判断・詰まった点は [`docs/todo/history/`](history/README.md) にセッション単位で残す。

| 区分 | 件数 | 記録 |
| --- | --- | --- |
| 要件定義 | 1 | [2026-09-04_要件定義の合意.md](history/2026-09-04_要件定義の合意.md) |
| 開発環境 | 2 | [2026-09-04_エージェント権限ポリシーの整合.md](history/2026-09-04_エージェント権限ポリシーの整合.md)・[2026-09-05_開発環境の構築.md](history/2026-09-05_開発環境の構築.md) |
