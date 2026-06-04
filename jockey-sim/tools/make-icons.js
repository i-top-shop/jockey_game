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

// --- 蹄鉄を描く（金属の陰影＋黄昏背景＋縁取り＋釘穴。4xスーパーサンプリング） ---
const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// 黄昏のラジアル背景（ゲーム本体の radial-gradient at 50% -10% に合わせる）
const BG_TOP = [0x1a, 0x2b, 0x36], BG_BOT = [0x09, 0x0e, 0x13];
// 金（芯=ハイライト→縁=暗）。ゲームの --gold #e8b84b を中間色に
const G_HI = [0xff, 0xe3, 0x90], G_MID = [0xe8, 0xb8, 0x4b], G_LO = [0x7c, 0x53, 0x1b];
const OUTLINE = [0x05, 0x08, 0x0b], HOLE = [0x0b, 0x0f, 0x15];

// 蹄鉄への帰属と「縁からの厚み」e(0=芯..1=縁)を返す
function shoeAt(x, y, cx, cy, R, halfW, gap, heels) {
  const d = Math.hypot(x - cx, y - cy);
  const fromTop = Math.abs(Math.atan2(y - cy, x - cx) / DEG + 90);
  let t = Infinity, member = false;
  if (fromTop > gap / 2) { const dd = Math.abs(d - R); if (dd < halfW) { member = true; t = dd; } }   // リング本体（上は開ける）
  for (const a of heels) { const hc = Math.hypot(x - (cx + Math.cos(a * DEG) * R), y - (cy + Math.sin(a * DEG) * R)); if (hc < halfW && hc < t) { member = true; t = hc; } } // ヒール
  return member ? { member: true, e: t / halfW } : { member: false };
}

function draw(size) {
  const SS = 4, S = size * SS, buf = Buffer.alloc(S * S * 4);
  const cx = S * 0.5, cy = S * 0.50, R = S * 0.30, W = S * 0.124, hw = W / 2, gap = 66, edge = S * 0.013;
  const heels = [-90 + gap / 2, -90 - gap / 2];
  const holes = []; for (let k = 0; k < 6; k++) { const a = -90 + (gap / 2 + 13) + k * ((360 - gap - 26) / 5); holes.push([cx + Math.cos(a * DEG) * R, cy + Math.sin(a * DEG) * R]); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    // 背景：上中央を光源にした黄昏グラデーション
    const gd = Math.hypot((x - S * 0.5) / (S * 0.62), (y + S * 0.10) / (S * 0.62));
    let col = lerp(BG_TOP, BG_BOT, clamp(gd, 0, 1));
    const s = shoeAt(x, y, cx, cy, R, hw, gap, heels);
    if (s.member) {
      const core = 1 - s.e;                               // 0縁..1芯
      const vert = clamp(1.12 - (y / S) * 1.22, 0, 1);    // 上ほど明るい（金属の照り）
      const m = clamp(core * 0.76 + vert * 0.30, 0, 1);
      col = m < 0.5 ? lerp(G_LO, G_MID, m / 0.5) : lerp(G_MID, G_HI, (m - 0.5) / 0.5);
      for (const [hx, hy] of holes) { if (Math.hypot(x - hx, y - hy) < W * 0.145) { col = HOLE; break; } } // 釘穴
    } else if (shoeAt(x, y, cx, cy, R, hw + edge, gap, heels).member) {
      col = lerp(col, OUTLINE, 0.8);                      // 縁取り（背景から分離）
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
