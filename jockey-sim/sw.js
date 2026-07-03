// Service Worker：アプリシェルをキャッシュしオフライン動作＆インストール可能に。
//   相対パスで記述（GitHub Pages のサブパス /<repo>/ でも壊れない）。
//   キャッシュを更新したい時は CACHE のバージョンを上げる。
const CACHE = "hizumeoto-v7";   // 収録実況（VOICEVOX音声バンク）。voice/*はランタイムキャッシュで随時保存
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
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      // 同一オリジンの成功GETは随時キャッシュ（フォント等のクロスオリジンは素通し）
      if (res.ok && new URL(req.url).origin === location.origin) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => caches.match("./index.html")))   // オフラインのナビゲーションはシェルへ
  );
});
