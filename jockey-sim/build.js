// 配布ビルド（生成補助・実行時非依存）：dist/ に配布用一式を組み立てる。
//   - dist/index.html      ← jockey_game.html（itch.io/Pages はエントリ名 index.html を要求）
//   - dist/vendor/three.min.js（ローカル同梱の Three.js r128）
// 依存ゼロ（Node標準のみ）。ゲーム本体はビルド無しでも vendor 参照でそのまま動く。
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");
const distVendor = path.join(dist, "vendor");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(distVendor, { recursive: true });

const copies = [
  ["jockey_game.html", path.join(dist, "index.html")],          // エントリ名を index.html へ
  ["vendor/three.min.js", path.join(distVendor, "three.min.js")],
  // PWA（インストール可能アプリ化）
  ["manifest.webmanifest", path.join(dist, "manifest.webmanifest")],
  ["sw.js", path.join(dist, "sw.js")],
  ["icon-192.png", path.join(dist, "icon-192.png")],
  ["icon-512.png", path.join(dist, "icon-512.png")],
  ["apple-touch-icon.png", path.join(dist, "apple-touch-icon.png")],
];
for (const [src, dest] of copies) {
  const s = path.join(root, src);
  if (!fs.existsSync(s)) { console.error("✗ 見つかりません: " + src); process.exit(1); }
  fs.copyFileSync(s, dest);
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`✓ ${src} → ${path.relative(root, dest)} (${kb} KB)`);
}

// 検証：index.html が vendor/three.min.js をローカル参照しているか（CDN残存の検出）
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
if (/<script[^>]+src=["']https?:\/\/[^"']*three/i.test(html)) {
  console.error("✗ Three.js がまだCDN参照のままです（vendor/three.min.js へ差し替えてください）");
  process.exit(1);
}
if (!/<script[^>]+src=["']vendor\/three\.min\.js["']/.test(html)) {
  console.error("✗ vendor/three.min.js への参照が見つかりません");
  process.exit(1);
}

console.log("\nBUILD OK → dist/");
console.log("  itch.io   : dist/ の中身（index.html と vendor/）をzipにしてアップロード→「This file will be played in the browser」を指定");
console.log("  GitHub Pages: リポジトリをpushし Settings→Pages→Source=GitHub Actions（.github/workflows/pages.yml が dist/ をデプロイ）");
console.log("  ローカル確認: npm run serve → http://localhost:8080/（PWA/インストール確認）");
