// dist/ を配信するローカル開発サーバ（依存ゼロ）。PWA/SW は http(s) が要るためこれで確認する。
//   先に `npm run build` で dist/ を生成しておくこと。 → http://localhost:8080/
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "dist");
const port = process.env.PORT || 8080;
const mime = { ".html": "text/html;charset=utf-8", ".js": "text/javascript", ".webmanifest": "application/manifest+json",
  ".json": "application/json", ".png": "image/png", ".css": "text/css", ".svg": "image/svg+xml" };

if (!fs.existsSync(root)) { console.error("dist/ がありません。先に `npm run build` を実行してください。"); process.exit(1); }

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(root, p);
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404 " + p); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(fp)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(d);
  });
}).listen(port, () => console.log("SERVING dist/ on http://localhost:" + port + "/"));
