// Service Worker：アプリシェルをキャッシュしオフライン動作＆インストール可能に。
//   相対パスで記述（GitHub Pages のサブパス /<repo>/ でも壊れない）。
//   キャッシュを更新したい時は CACHE のバージョンを上げる。
const CACHE = "hizumeoto-v8";   // 実況ボイス高音化＋バリエーション増。以降HTML/manifestはネットワーク優先＝自動更新
const SHELL = [
  "./",
  "./index.html",
  "./vendor/three-bundle.js",
  "./vendor/Horse.glb",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // HTML（ナビゲーション）と voice/manifest.json は「ネットワーク優先」＝デプロイが即座に届く
  //（オフライン時のみキャッシュへフォールバック）。音声・3D等の静的資産はキャッシュ優先で高速。
  const netFirst = req.mode === "navigate" || /manifest\.json$/.test(url.pathname);
  if (netFirst) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && url.origin === location.origin) {
          const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      // 同一オリジンの成功GETは随時キャッシュ（フォント等のクロスオリジンは素通し）
      if (res.ok && url.origin === location.origin) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => caches.match("./index.html")))   // オフラインのナビゲーションはシェルへ
  );
});
