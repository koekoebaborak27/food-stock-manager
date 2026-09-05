# API

経路・応答の形・状態コードの決まりは [02_API共通.md](../00_共通/02_API共通.md) のとおり。ここでは経路の一覧と、この機能だけの`code`を定める。

## 1. 経路の一覧

| やること | 方法 | 経路 | 補足 |
| --- | --- | --- | --- |
| Googleログインを始める | GET | `/api/auth/google` | ブラウザを直接この経路へ移す（JSON ではなくリダイレクト） |
| Googleからの戻りを受ける | GET | `/api/auth/google/callback` | 利用者を登録・更新し、セッションCookieを発行してアプリへリダイレクトする |
| ログアウトする | POST | `/api/auth/logout` | セッションCookieを失効させる |
| ログイン状態を確かめる | GET | `/api/auth/session` | 表示名・アイコン・家族グループへの所属有無・役割を返す。未ログインは401 |
| 自分の情報を変える | PATCH | `/api/users/me` | 表示名だけを変更できる |
| 退会する | DELETE | `/api/users/me` | 個人情報を空にし、所属していれば家族グループも脱退する |
| 家族グループをつくる | POST | `/api/households` | 呼んだ利用者を管理者として登録する |
| 招待コードで参加する | POST | `/api/invitations/redeem` | 本文は`{ "code": "..." }` |
| 自分の家族グループとメンバー一覧を見る | GET | `/api/households/me` | |
| 家族グループを脱退する | DELETE | `/api/households/me/membership` | 自分自身が対象 |
| メンバーを除名する | DELETE | `/api/households/me/members/{userId}` | 管理者だけ |
| 家族グループを削除する | DELETE | `/api/households/me` | 管理者だけ |
| 招待コードを発行・再表示する | POST | `/api/invitations` | 有効なコードがあればそれを返し、なければ新規に発行する |

## 2. この機能だけの`code`

| 状態コード | `code` | どんなとき |
| --- | --- | --- |
| 404 | `INVITATION_NOT_FOUND` | 招待コードが存在しない、またはすでに使われた |
| 404 | `INVITATION_EXPIRED` | 招待コードの有効期限が切れている |
| 409 | `HOUSEHOLD_HAS_OTHER_MEMBERS` | 管理者が、他のメンバーが残ったまま脱退・退会しようとした |
| 403 | `LAST_ADMIN_CANNOT_BE_REMOVED` | 一般メンバーが除名・家族グループの削除を呼ぼうとした、または管理者を除名しようとした |

- `/api/households/me/membership`の脱退で、呼んだ利用者が管理者かつ最後の1人の場合は、脱退と同時に家族グループも削除する（要件どおり）。エラーにはしない。

## 3. 参照

- [02_API共通.md](../00_共通/02_API共通.md)
- [01_データベース.md](01_データベース.md)
