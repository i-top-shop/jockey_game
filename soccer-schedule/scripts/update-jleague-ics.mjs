#!/usr/bin/env node
// Ｊリーグ日程の更新スクリプト（ICS方式・Node 18+ / 依存なし）
//
// Ｊリーグ公式サイトの日程から自動生成されているコミュニティリポジトリ
//   https://github.com/takahashimasaki4biz/j-schedule-ics-maker
// のクラブ別ICSカレンダーを取得し、Ｊ１全節とＪ２（コンサドーレ札幌のみ）を
// data/matches.js に反映する。欧州リーグのデータには触れない。
//
//   node scripts/update-jleague-ics.mjs            # クローンして更新
//   node scripts/update-jleague-ics.mjs --dir=path # クローン済みディレクトリを使う
//
// 注意: ICSは「これからの試合」だけを含むため、消化済みの試合は既存データを
// そのまま残す（スコアはネタバレ防止のため一切保存しない）。

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data", "matches.js");
const args = Object.fromEntries(process.argv.slice(2).map(a => (a.match(/^--([^=]+)(?:=(.*))?$/) || [, a, true]).slice(1)));

// 2026-27シーズンのＪ１ 20クラブに対応するICSファイル名
const J1_FILES = ["kashima","urawa","kashiwa","ftokyo","tokyov","machida","kawasakif","yokohamafm",
  "nagoya","kyoto","gosaka","cosaka","kobe","hiroshima","okayama","fukuoka","shimizu","mito","nagasaki","chiba"];

let dir = args.dir;
let cleanup = false;
if (!dir) {
  dir = join(tmpdir(), "j-schedule-ics-maker");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  console.log("ICSリポジトリを取得中 ...");
  execSync(`git clone --depth 1 https://github.com/takahashimasaki4biz/j-schedule-ics-maker "${dir}"`, { stdio: "inherit" });
  cleanup = true;
}
const ICS = join(dir, "all-clubs-ics");

function parseIcs(file) {
  const text = readFileSync(join(ICS, file + ".ics"), "utf8").replace(/\r\n[ \t]/g, "");
  const events = [];
  for (const block of text.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0].replace(/BEGIN:VALARM[\s\S]*?END:VALARM/g, "");
    const get = k => { const m = body.match(new RegExp("^" + k + "(?:;[^:]*)?:(.*)$", "m")); return m ? m[1].trim() : null; };
    const md = (get("DESCRIPTION\\b") ?? "").match(/^第(\d+)節$/);
    if (!md) continue; // リーグ戦以外(天皇杯・ルヴァン杯)は除外
    const sm = (get("SUMMARY\\b") || "").match(/^(.+?)vs(.+?)\s*@(.*?)\s*(未定|\d{1,2}:\d{2})〜?\s*$/);
    const dt = body.match(/^DTSTART(;VALUE=DATE)?:([0-9TZ]+)$/m);
    if (!sm || !dt) continue;
    let jst_date, jst_time;
    if (dt[1]) { jst_date = `${dt[2].slice(0, 4)}-${dt[2].slice(4, 6)}-${dt[2].slice(6, 8)}`; jst_time = null; }
    else {
      const j = new Date(new Date(dt[2].replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z")).getTime() + 9 * 3600e3);
      jst_date = j.toISOString().slice(0, 10); jst_time = j.toISOString().slice(11, 16);
    }
    events.push({ matchday: Number(md[1]), jst_date, jst_time, home: sm[1].trim(), away: sm[2].trim(), venue: sm[3].trim() || undefined });
  }
  return events;
}
const jstToUtc = (date, time) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mi] = time ? time.split(":").map(Number) : [15, 0];
  return new Date(Date.UTC(y, m - 1, d, hh - 9, mi)).toISOString().replace(".000Z", "Z");
};

// ICS読み込み（Ｊ１は全クラブ突合で重複除去・Ｊ２は札幌のみ）
const seen = new Map();
for (const f of J1_FILES) for (const e of parseIcs(f)) seen.set(`J1|${e.matchday}|${e.home}|${e.away}`, { league: "J1", ...e });
for (const e of parseIcs("sapporo")) seen.set(`J2|${e.matchday}|${e.home}|${e.away}`, { league: "J2", ...e });
console.log(`ICSから J1 ${[...seen.values()].filter(m => m.league === "J1").length}試合 / J2札幌 ${[...seen.values()].filter(m => m.league === "J2").length}試合 を取得`);

// 既存データとマージ
const src = readFileSync(DATA, "utf8");
const data = JSON.parse(src.match(/window\.SCHEDULE_DATA\s*=\s*([\s\S]*?);\s*$/)[1]);
const key = m => `${m.league}|${m.matchday}|${m.home}|${m.away}`;
const out = [];
for (const m of data.matches) {
  if (m.league !== "J1" && m.league !== "J2") { out.push(m); continue; }
  const n = seen.get(key(m));
  if (!n) { out.push(m); continue; } // 消化済み等・ICSに無い試合は既存を維持
  seen.delete(key(m));
  out.push({ ...m, utc: jstToUtc(n.jst_date, n.jst_time), venue: n.venue ?? m.venue,
    tbd: n.jst_time ? undefined : true, dateTBD: undefined });
}
for (const n of seen.values()) // 新規に発表された試合
  out.push({ league: n.league, matchday: n.matchday, utc: jstToUtc(n.jst_date, n.jst_time),
    home: n.home, away: n.away, venue: n.venue, status: "SCHEDULED", tbd: n.jst_time ? undefined : true });

data.matches = out
  .map(m => ({ ...m, score: undefined })) // ネタバレ防止: スコアは保存しない
  .map(m => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)))
  .sort((a, b) => a.utc.localeCompare(b.utc) || a.league.localeCompare(b.league));
data.generatedAt = new Date().toISOString();
writeFileSync(DATA, "// scripts/update*.mjs により自動生成。手で編集しないこと。\nwindow.SCHEDULE_DATA = " + JSON.stringify(data, null, 1) + ";\n");
console.log(`✔ ${DATA} を更新（全${data.matches.length}試合）`);
if (cleanup) rmSync(dir, { recursive: true, force: true });
