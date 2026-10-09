#!/usr/bin/env node
// 欧州5リーグの日程更新（openfootball 方式・Node 18+ / 依存なし / APIキー不要）
//
// 公式日程を週次で反映しているコミュニティデータ https://github.com/openfootball
// (england / espana / italy / deutschland / france) を取得し、
//   - 確定済みの個別キックオフ日時（放送編成反映後）
//   - 試合の消化状況（スコアが載っていれば「終了」。スコア自体は保存しない）
//   - 延期・日程変更
// を data/matches.js に反映する。Ｊリーグのデータには触れない。
//
//   node scripts/update-europe.mjs              # クローンして更新
//   node scripts/update-europe.mjs --dir=path   # 既にクローン済みの親ディレクトリ(england/ 等がある場所)を使う
//
// ルール: openfootball に個別時刻があればそれを採用。節内の全試合が同じ日時で並ぶ「一括仮時刻」は
// 未確定とみなし、既存データに確定時刻があればそれを維持、無ければ暫定日付＋時刻未定(tbd)にする。

import { readFileSync, existsSync, rmSync } from "node:fs";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { JA, VENUE, loadData, saveData } from "./lib/teams.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data", "matches.js");
const args = Object.fromEntries(process.argv.slice(2).map(a => (a.match(/^--([^=]+)(?:=(.*))?$/) || [, a, true]).slice(1)));

const SEASON = "2026-27";
const SRC = [
  { league: "PL",  repo: "england",     file: `${SEASON}/1-premierleague.txt`,   tz: "london" },
  { league: "PD",  repo: "espana",      file: `${SEASON}/1-liga.txt`,            tz: "cet" },
  { league: "SA",  repo: "italy",       file: `${SEASON}/1-seriea.txt`,          tz: "cet" },
  { league: "BL1", repo: "deutschland", file: `${SEASON}/1-bundesliga.txt`,      tz: "cet" },
  { league: "FL1", repo: "france",      file: `france/${SEASON}_fr1.txt`,        tz: "cet" },
];

let base = args.dir;
let cleanup = false;
if (!base) {
  base = join(tmpdir(), "openfootball");
  cleanup = true;
  for (const s of SRC) {
    const d = join(base, s.repo);
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    console.log(`openfootball/${s.repo} を取得中 ...`);
    execSync(`git clone -q --depth 1 https://github.com/openfootball/${s.repo} "${d}"`, { stdio: "inherit" });
  }
}

// ---- 欧州の夏時間（EU共通: 3月最終日曜〜10月最終日曜）----
function lastSunday(y, m) { const d = new Date(Date.UTC(y, m, 0)); return d.getUTCDate() - d.getUTCDay(); }
function utcOffset(tz, y, m, d) {
  const key = y * 10000 + m * 100 + d;
  const dstStart = y * 10000 + 300 + lastSunday(y, 3), dstEnd = y * 10000 + 1000 + lastSunday(y, 10);
  const summer = key >= dstStart && key < dstEnd;
  if (tz === "london") return summer ? 1 : 0;
  return summer ? 2 : 1;
}
const MONTHS = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };

function parseTxt(text, league, tz) {
  let md = 0, y = 0, m = 0, d = 0, time = null;
  const rows = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    let x;
    if ((x = line.match(/^[▪»]?\s*Matchday (\d+)/))) { md = Number(x[1]); continue; }
    if ((x = line.match(/^\s{1,4}(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\w{3}) (\d{1,2})(?: (\d{4}))?\s*$/))) {
      const nm = MONTHS[x[1]];
      if (x[3]) y = Number(x[3]); else if (m && nm < m) y += 1;
      m = nm; d = Number(x[2]); time = null; continue;
    }
    if ((x = line.match(/^\s+(?:(\d{1,2}):(\d{2})\s+)?(\S.*?)\s+v\s+(\S.*?)(?:\s+(\d+)-(\d+).*)?\s*$/))) {
      if (x[1]) time = [Number(x[1]), Number(x[2])];
      if (!md || !y) continue;
      rows.push({ league, matchday: md, y, m, d, hh: time ? time[0] : 15, mi: time ? time[1] : 0,
        home_en: x[3].trim(), away_en: x[4].trim(), played: x[5] != null });
    }
  }
  // 一括仮時刻の検出（同一節で同じ日時が6試合以上）
  const byMd = {};
  for (const r of rows) (byMd[r.matchday] ??= []).push(r);
  for (const g of Object.values(byMd)) {
    const c = {};
    for (const r of g) { const k = `${r.m}/${r.d} ${r.hh}:${r.mi}`; c[k] = (c[k] || 0) + 1; }
    for (const r of g) r.tbd = c[`${r.m}/${r.d} ${r.hh}:${r.mi}`] >= 6;
  }
  return rows.map(r => {
    const off = utcOffset(tz, r.y, r.m, r.d);
    return { ...r, utc: new Date(Date.UTC(r.y, r.m - 1, r.d, r.hh - off, r.mi)).toISOString().replace(".000Z", "Z") };
  });
}

const data = loadData(DATA, fs);
const index = new Map(data.matches.map(m => [`${m.league}|${m.matchday}|${m.home}|${m.away}`, m]));
const report = [];
for (const s of SRC) {
  const file = join(base, s.repo, s.file);
  if (!existsSync(file)) { report.push(`${s.league}: ファイルなし ${file}`); continue; }
  const rows = parseTxt(readFileSync(file, "utf8"), s.league, s.tz);
  let timeSet = 0, kept = 0, fin = 0, added = 0, missing = 0;
  for (const r of rows) {
    const home = JA[r.home_en], away = JA[r.away_en];
    if (!home || !away) { missing++; report.push(`  !! 対訳なし: ${r.home_en} / ${r.away_en}`); continue; }
    const k = `${s.league}|${r.matchday}|${home}|${away}`;
    let m = index.get(k);
    if (!m) {
      m = { league: s.league, matchday: r.matchday, utc: r.utc, home, away, venue: VENUE[home], status: "SCHEDULED", tbd: r.tbd || undefined };
      data.matches.push(m); index.set(k, m); added++;
    } else if (!r.tbd) { m.utc = r.utc; delete m.tbd; timeSet++; }
    else if (m.tbd) { m.utc = r.utc; }            // 暫定日付だけ追随
    else kept++;                                  // 既存の確定時刻を維持
    if (r.played) { m.status = "FINISHED"; fin++; }
  }
  report.push(`${s.league}: ${rows.length}試合読込 / 個別時刻反映${timeSet} / 既存確定維持${kept} / 終了${fin} / 新規${added}${missing ? " / 対訳なし" + missing : ""}`);
}
saveData(DATA, fs, data);
console.log(report.join("\n"));
console.log(`✔ ${DATA} を更新（全${data.matches.length}試合）`);
if (cleanup) rmSync(base, { recursive: true, force: true });
