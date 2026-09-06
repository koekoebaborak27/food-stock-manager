// PWAのService Worker。
// 常備食・買い物リストのデータは端末に保存しない方針のため
// （docs/specs/01_requirements/00_共通/01_プロダクト共通.md）、
// 画面やAPIのfetchを横取りするキャッシュ処理は持たせない。
// ここではプッシュ通知の受信と、通知をタップしたときの遷移だけを扱う。

self.addEventListener("install", () => {
  // 新しいService Workerをすぐ有効にする。保存するデータが無く、
  // 古い版を保持する理由も無いため。
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 配信される通知の内容は
// docs/specs/02_basic-design/40_期限通知/02_API.md 4節のとおり
// { title, body, url } の形を想定する。
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title ?? "期限が近い食品があります";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      data: { url: payload.url ?? "/stocks" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/stocks";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clientsList.find((client) =>
        client.url.includes(new URL(url, self.location.origin).pathname),
      );
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
