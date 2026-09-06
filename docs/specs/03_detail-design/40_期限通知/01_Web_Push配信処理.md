# Web Push配信処理

[00_期限通知共通.md](../../02_basic-design/40_期限通知/00_期限通知共通.md)・[01_データベース.md](../../02_basic-design/40_期限通知/01_データベース.md)・[02_API.md](../../02_basic-design/40_期限通知/02_API.md)が定める配信バッチ（`POST /api/internal/notifications/dispatch`）を、実際にどの順・どのクエリで実装するかをここにまとめる。

## 1. 世帯の確保（二重配信の防止）

[01_データベース.md 2節](../../02_basic-design/40_期限通知/01_データベース.md)の「条件付き更新1つにまとめる」を、`NotificationSetting`行が**すでにある世帯**と**まだ無い世帯（既定の8:00・未配信）**とで分けて行う。1世帯ずつ処理する（件数は家族単位の個人利用を想定しており、まとめて1文にする複雑さに見合わない）。

1. 現在時刻を[2節](#2-15分枠への丸め方)の枠（`notifyHour` `notifyMinute`）に丸める。
2. `notifyHour` `notifyMinute` がその枠と一致する`NotificationSetting`行を`findMany`で取る。
3. 取れた行それぞれに対し、次の`updateMany`を実行し、`count === 1`なら確保できたとみなす。

   ```ts
   prisma.notificationSetting.updateMany({
     where: {
       householdId,
       notifyHour: slot.hour,
       notifyMinute: slot.minute,
       OR: [{ lastNotifiedOn: null }, { lastNotifiedOn: { not: today } }],
     },
     data: { lastNotifiedOn: today },
   });
   ```

   `where`に`lastNotifiedOn`の条件を含めたまま更新することで、確認と書き換えが1つのSQL文になり、2つの配信処理が同時に動いても`count`が1になるのはどちらか一方だけになる。
4. 枠が既定値（8:00）と一致するときだけ、`NotificationSetting`行を持たない世帯（`household.notificationSetting`が`null`）も対象に加える。行が無いため3の`updateMany`が使えず、代わりに`create`する。

   ```ts
   try {
     await prisma.notificationSetting.create({
       data: { householdId, notifyHour: 8, notifyMinute: 0, lastNotifiedOn: today },
     });
     // 確保できた
   } catch (error) {
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
       // 別の配信処理が先に行を作っていた。確保できなかったので何もしない
     } else {
       throw error;
     }
   }
   ```

   `householdId`が一意制約付きのため、2つの配信処理が同時に`create`しても成功するのは一方だけになる（[02_重複判定と一括操作の整合性.md 1節](../30_買い物リスト/02_重複判定と一括操作の整合性.md)と同じ、一意制約をそのまま排他制御に使う考え方）。

5. 3・4で確保できた世帯のIDだけを、後続の集計・配信の対象にする。

## 2. 15分枠への丸め方

- 現在時刻を日本時間（`Asia/Tokyo`）の時・分に変換し、分を15分単位で切り捨てる（`Math.floor(minute / 15) * 15`）。
- 日付も同時に日本時間の暦日文字列（`YYYY-MM-DD`）にしておき、1節の`today`と`NotificationSetting.lastNotifiedOn`の比較に使う。[stock.service.ts](../../../../apps/api/src/stock/stock.service.ts)の`getJapanDate`と同じ考え方（時刻でなく日本時間の暦日で比べる）を使う。
- テストのために、現在時刻を引数で渡せる純粋関数として切り出す（既定値は`new Date()`）。

## 3. 件数の数え方

- 対象は期限切れ・今日が期限・明日が期限の`Stock`（削除済み・消費済は除く）。[20_常備食管理/02_API.md](../../02_basic-design/20_常備食管理/02_API.md)の一覧画面が使う`urgentOnly`と同じ判定にするため、新しく条件を書き直さず、`StockService`が持つ絞り込み（`urgentOnly`と同じ`where`条件）を再利用する。
- `StockModule`から`StockService`をexportし、配信処理側のモジュールから読み込んで使う。

## 4. 配信対象の利用者と送信

1. 確保できた世帯ごとに3節の件数を数え、0件なら送信しない（購読は消さない。翌日また対象になり得るため）。
2. 1件以上なら、その世帯に所属する利用者（`Membership`）に紐づく`PushSubscription`を`findMany({ where: { user: { memberships: { some: { householdId } } } } })`で取り、1件ずつ`web-push`パッケージの`sendNotification`を呼ぶ。
3. 本文は[02_API.md 4節](../../02_basic-design/40_期限通知/02_API.md#4-配信処理の流れ)のとおり`{ title, body, url }`をJSON化したもの。`url`は常備食リスト（`apps/web`のトップ画面`/`。[画面遷移図 3節](../../02_basic-design/画面遷移図.md#3-図01-全体の画面遷移)）を`urgentOnly=true`で開く`/?urgentOnly=true`。
4. 送信が失敗したら再送しない。送信を担う`PushSender`（実装は`WebPushSender`）は内部で例外を捕まえ、`web-push`の`WebPushError`のうち`statusCode`が404または410（購読先がもう存在しない）のときだけ`{ invalid: true }`を返す。それ以外の失敗（一時的な通信エラー等）は`{ invalid: false }`を返し、何もしない（[01_期限通知.md 5節](../../01_requirements/40_期限通知/01_期限通知.md#5-例外時の扱い)のとおり、翌日の配信に任せる）。呼び出し側は`invalid`が`true`のときだけ`PushSubscription`行を`deleteMany`で消す（`delete`ではなく`deleteMany`にすることで、対象がすでに無くても失敗しない）。
5. `PushSender`をテストで差し替えられるようにすることで、実際に外部へ送信せずに1〜4の分岐をテストする。

## 5. 認証

- [02_API.md 3節](../../02_basic-design/40_期限通知/02_API.md#3-内部配信-apiの認証)のとおり、`X-Internal-Secret`ヘッダーの値を環境変数`INTERNAL_NOTIFICATION_SECRET`と比較するだけの`InternalAuthGuard`を作る。`SessionGuard`は使わない（Cookieを発行・確認しない）。
- 値が一致しない、または環境変数が未設定のときは401 `INTERNAL_UNAUTHORIZED`を返す。

## 6. 通知を押したときの遷移先

- 常備食リスト画面（`apps/web`のトップ画面`/`。`StockListPage`）は、これまでURLの`urgentOnly`パラメータを読んでいなかった（画面内の絞り込みトグルの状態としてのみ持っていた）。通知から開いたときに絞り込んだ状態で表示するため、`useSearchParams`でURLの`urgentOnly=true`を読み、初期状態として使うようにする。
- `useSearchParams`を使うクライアントコンポーネントはSuspenseで包む必要があるため、`apps/web/src/app/page.tsx`で`StockListPage`を`<Suspense>`で包む。

## 7. 参照

- [00_期限通知共通.md](../../02_basic-design/40_期限通知/00_期限通知共通.md)
- [01_データベース.md](../../02_basic-design/40_期限通知/01_データベース.md)
- [02_API.md](../../02_basic-design/40_期限通知/02_API.md)
- [01_期限通知.md（要件定義）](../../01_requirements/40_期限通知/01_期限通知.md)
