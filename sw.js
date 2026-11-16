/* マイ資産：アプリの画面を iPhone に保存して、電波が弱くても起動できるようにする仕組み
 * （資産データはここでは扱いません。保存するのは画面のファイルだけです）
 * 画面を更新したときは、下の VERSION の数字を1つ上げてください。 */
const VERSION = 'kb-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 最新版を取りに行く（ブラウザ側の一時保存は使わず、必ずGitHubに確認する）
function fresh(url, cache, key) {
  return fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
    .then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Googleとの通信（資産データ）には一切さわらない
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith(caches.open(VERSION).then(async cache => {
    if (isPage) {
      // 画面本体：まず最新版を取りに行き、電波がないときだけ保存済みを使う
      try { return await fresh(url.pathname, cache, './index.html'); }
      catch (err) { return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error(); }
    }
    // アイコンなど：保存済みをすぐ使い、裏で最新版に入れ替える
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fresh(req.url, cache, req).catch(() => hit);
    return hit || net;
  }));
});
