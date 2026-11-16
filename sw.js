/* マイ資産：アプリの画面を iPhone に保存して、すぐ起動できるようにする仕組み
 * （資産データはここでは扱いません。保存するのは画面のファイルだけです）
 * 画面を更新したときは、下の VERSION の数字を1つ上げてください。 */
const VERSION = 'kb-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 画面のファイル：保存済みのものをすぐ表示し、裏で最新版に入れ替える
// Googleとの通信（資産データ）には一切さわらない
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
