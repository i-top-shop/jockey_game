// PWAアイコン生成（ゼロ依存）：蹄鉄モチーフのPNGを複数サイズ出力。再生成可能なアイコン原本。
//   出力: jockey-sim/icon-192.png / icon-512.png / apple-touch-icon.png(180)
//   実行: node tools/make-icons.js
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// --- PNGエンコーダ（truecolor+alpha, filter 0） ---
const crcTable = (() => { const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) { raw[y * (1 + w * 4)] = 0; rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// --- 蹄鉄を描く（4xスーパーサンプリングで縁を滑らかに） ---
const BG = [0x0c, 0x12, 0x18], GOLD = [0xe8, 0xb8, 0x4b], HOLE = [0x0a, 0x0e, 0x12];
const DEG = Math.PI / 180;
function draw(size) {
  const SS = 4, S = size * SS;
  const buf = Buffer.alloc(S * S * 4);
  const cx = S / 2, cy = S * 0.53, R = S * 0.30, W = S * 0.108, gap = 64;  // 半径/太さ/上の開き角
  const heels = [-90 + gap / 2, -90 - gap / 2];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    let col = BG;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) / DEG;                 // 右=0,下=90,上=-90
    const fromTop = Math.abs(ang + 90);
    if (Math.abs(d - R) < W / 2 && fromTop > gap / 2) col = GOLD;   // リング本体（上は開ける）
    for (const a of heels) {                              // ヒール（両端の丸み）
      if (Math.hypot(x - (cx + Math.cos(a * DEG) * R), y - (cy + Math.sin(a * DEG) * R)) < W / 2) col = GOLD;
    }
    if (col === GOLD) {                                   // 釘穴
      for (let k = 0; k < 6; k++) {
        const a = -90 + (gap / 2 + 10) + k * ((360 - gap - 20) / 5);
        if (Math.hypot(x - (cx + Math.cos(a * DEG) * R), y - (cy + Math.sin(a * DEG) * R)) < W * 0.17) col = HOLE;
      }
    }
    buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = 255;
  }
  // 平均でダウンサンプル
  const out = Buffer.alloc(size * size * 4), n = SS * SS;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const i = (((y * SS + sy) * S) + (x * SS + sx)) * 4; r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; }
    const o = (y * size + x) * 4; out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n); out[o + 3] = 255;
  }
  return out;
}

const outDir = path.join(__dirname, "..");
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const png = encodePNG(size, size, draw(size));
  fs.writeFileSync(path.join(outDir, name), png);
  console.log(`✓ ${name} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
console.log("ICONS OK");
