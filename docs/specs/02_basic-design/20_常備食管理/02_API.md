# API

経路・応答の形・状態コードの決まりは [02_API共通.md](../00_共通/02_API共通.md) のとおり。ここでは経路の一覧と、この機能だけの `code` を定める。

## 1. 経路の一覧

| やること | 方法 | 経路 | 補足 |
| --- | --- | --- | --- |
| 常備食の一覧を取る | GET | `/api/stocks` | クエリ文字列: `storageType`（`ALL` \| `REFRIGERATED` \| `FROZEN` \| `ROOM_TEMPERATURE`。既定 `ALL`）、`keyword`（食品名の部分一致）、`sort`（`EXPIRY` \| `CREATED` \| `NAME`。既定 `EXPIRY`）、`urgentOnly`（`true` のとき期限切れ・今日・明日の食品だけ）。消費済・削除済は含めない |
| 常備食を1件取る | GET | `/api/stocks/{id}` | |
| 常備食を登録する | POST | `/api/stocks` | 応答に `duplicateName`（同じ食品名がすでにあれば `true`）を含める |
| 常備食を編集する | PUT | `/api/stocks/{id}` | 本文に画面が読んだ `updatedAt` を含める（[02_API共通.md 8](../00_共通/02_API共通.md#8-更新の競合の伝え方)） |
| 残数を増減する | PATCH | `/api/stocks/{id}/quantity` | 本文 `{ "delta": 1 }` または `{ "delta": -1 }`。`updatedAt` は不要 |
| 消費済にする | POST | `/api/stocks/{id}/consume` | 本文 `{ "addToShoppingList": boolean }`。買い物リストへの追加は 30_買い物リスト の処理を呼ぶ |
| 常備食を削除する | DELETE | `/api/stocks/{id}` | 本文に画面が読んだ `updatedAt` を含める |
| 削除を元に戻す | POST | `/api/stocks/{id}/restore` | 削除から5秒以内かどうかはフロントエンドが判断し、過ぎたら呼ばない |
| 消費済リストを取る | GET | `/api/stocks/consumed` | 常に `consumedAt` の降順 |
| 消費済食品を常備食へ再登録する | POST | `/api/stocks/{id}/re-register` | `id` は消費済食品。`name` `storageType` `unit` を引き継ぎ、`quantity: 1` `expiresOn: null` で新しい行を作る。作った食品を201で返す |

- 買い物リストへの追加（常備食リスト・詳細のカートアイコン、消費済リストからの追加）は 30_買い物リスト の API を呼ぶ。この機能の経路には含めない。

## 2. この機能だけの `code`

| 状態コード | `code` | どんなとき |
| --- | --- | --- |
| 409 | `STOCK_UPDATE_CONFLICT` | 編集・削除しようとしたら、他の利用者が先に更新していた |
| 404 | `STOCK_NOT_FOUND` | 対象の常備食が存在しない、削除済み、または他の家族グループのもの（[02_API共通.md 4](../00_共通/02_API共通.md#4-家族グループでの絞り込み)） |

## 3. 参照

- [02_API共通.md](../00_共通/02_API共通.md)
- [01_データベース.md](01_データベース.md)
