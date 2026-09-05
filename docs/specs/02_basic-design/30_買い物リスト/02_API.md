# API

共通の形・状態コード・本人と世帯の特定は [02_API共通.md](../00_共通/02_API共通.md) のとおり。ここでは買い物リストだけの経路と `code` を定める。

## 1. 経路の一覧

| やること | 方法 | 経路 | 本文・補足 |
| --- | --- | --- | --- |
| 商品一覧を取る | GET | `/api/shopping-items` | 未購入と購入済みを含めて返す |
| 商品を追加する | POST | `/api/shopping-items` | 直接入力は `{ "name": "牛乳" }`、常備食からは `{ "sourceStockId": "UUID" }`。両方は送れない |
| 購入状態を変える | PATCH | `/api/shopping-items/{id}/purchased` | `{ "isPurchased": boolean, "returnToStock": boolean, "storageType": "REFRIGERATED" }`。未購入から購入済みへ変え、`returnToStock` が `true` のときだけ `storageType` は必須 |
| 商品を 1 件削除する | DELETE | `/api/shopping-items/{id}` | 本文に画面が読んだ `updatedAt` を入れる |
| 購入済みを一括削除する | DELETE | `/api/shopping-items/purchased` | `{ "items": [{ "id": "UUID", "updatedAt": "ISO 8601" }] }`。確認画面に表示した購入済み商品を全件指定する |
| 削除を元に戻す | POST | `/api/shopping-items/restore` | `{ "items": [{ "id": "UUID", "updatedAt": "削除後の ISO 8601" }] }`。1件・一括削除のどちらにも使う |

- `PATCH .../purchased` で `isPurchased` が `false` のとき、`returnToStock` と `storageType` は送れない。送られた場合は入力エラーとする。
- 購入済みへ変えるときは、商品と元の常備食を読み、常備食への登録と商品状態の更新を 1 つのデータベース処理として行う（[00_買い物リスト共通.md 3](00_買い物リスト共通.md#3-購入状態と常備食への登録)）。
- 状態を変える要求は、商品を読んだときの `updatedAt` を本文に含める。競合時は変更せず 409 を返す。
- 一括削除と復元の `items` は 1 件以上で ID の重複を許さない。不正な UUID・日時・型、必要項目の欠落、追加時の `name` と `sourceStockId` の両方指定・両方省略は `VALIDATION_ERROR` とする。
- 購入済みにする場合は `returnToStock` を必須とする。`false` の場合は `storageType` を送れない。`true` の場合は画面が初期選択を含む保存区分を必ず送る。不正な組み合わせや保存区分は `INVALID_PURCHASE_UPDATE` とする。
- 一括削除は対象全件の所属を確認し、購入済み・未削除・`updatedAt` の一致を確認する。所属する商品が更新・削除済みなら `SHOPPING_ITEM_UPDATE_CONFLICT`、存在しないか別世帯なら `SHOPPING_ITEM_NOT_FOUND` とする。全件が条件を満たす場合だけ削除する。
- 削除は 200 で `{ "items": [{ "id": "UUID", "updatedAt": "削除後の ISO 8601" }] }` を返す。復元は 200 で復元した商品を `{ "items": [...] }` として返す。単品作成・購入状態変更は商品 1 件を返す。それ以外は [02_API共通.md 5.1](../00_共通/02_API共通.md#51-うまくいったとき) に従う。
- 一覧の商品には `id`・`name`・`isPurchased`・`sourceStockId`・`createdAt`・`updatedAt` と `sourceStock` を返す。`sourceStock` は同じ世帯の未削除の元食品があれば `{ "id", "storageType", "consumedAt" }`、なければ `null` とする。消費済でも保存区分の初期表示に使う。購入時にはサーバーで改めて状態を確認する。
- 固定の `/purchased` と `/restore` は `/{id}` と区別し、UUID として処理しない。

## 2. この機能だけの `code`

| 状態コード | `code` | どんなとき |
| --- | --- | --- |
| 400 | `SHOPPING_ITEM_NAME_REQUIRED` | 直接入力の商品名が空 |
| 400 | `SHOPPING_ITEM_NAME_TOO_LONG` | 商品名が31文字以上 |
| 400 | `INVALID_PURCHASE_UPDATE` | 購入状態と常備食へ戻す指定の組み合わせが不正 |
| 404 | `SHOPPING_ITEM_NOT_FOUND` | 商品がない、削除済み、または別世帯の商品 |
| 404 | `SOURCE_STOCK_NOT_FOUND` | 追加元の常備食がない、削除済み、または別世帯のもの |
| 409 | `SHOPPING_ITEM_ALREADY_EXISTS` | 同名の未購入商品がすでにある |
| 409 | `SHOPPING_ITEM_UPDATE_CONFLICT` | 購入状態の変更・削除・復元で先に更新されていた、または現在と同じ購入状態を要求した |
| 409 | `SOURCE_STOCK_QUANTITY_LIMIT` | 加算先の常備食の残数が 99 |

## 3. 参照

- [00_買い物リスト共通.md](00_買い物リスト共通.md)
- [01_データベース.md](01_データベース.md)
- [02_API共通.md](../00_共通/02_API共通.md)
