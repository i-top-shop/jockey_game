#!/usr/bin/env node
// 補正ファイル（data/corrections/*.json）を data/matches.js に適用し、
// 消化状況（終了／未消化）を現在時刻から確定する仕上げスクリプト。
//
//   node scripts/apply-corrections.mjs               # data/corrections/*.json をすべて適用 → 仕上げ
//   node scripts/apply-corrections.mjs --only=finalize   # 仕上げ（終了判定）のみ
//
// 補正ファイルの形式（WebSearch等で確認した「確定キックオフ日時」「日程変更」を人手またはエージェントが記録）:
// {
//   "source": "出所メモ",
//   "matches": [
//     { "league": "PL", "matchday": 10, "home_en": "Arsenal", "away_en": "Chelsea", "jst_date": "2026-11-08", "jst_time": "01:30" },
//     { "league": "J1", "matchday": 20, "home": "京都サンガF.C.", "away": "ファジアーノ岡山", "jst_date": "2026-12-19", "jst_time": "14:00", "venue": "…" }
//   ]
// }
// jst_time が null なら「日付のみ確定（時刻未定）」。欧州は home_en/away_en（英語名のゆれは自動照合）、Ｊは home/away（日本語）。

import * as fs from "node:fs";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JA, buildIndex, matchTeam, jName, jstToUtc, loadData, saveData } from "./lib/teams.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data", "matches.js");
const CORR = join(ROOT, "data", "corrections");
const args = Object.fromEntries(process.argv.slice(2).map(a => (a.match(/^--([^=]+)(?:=(.*))?$/) || [, a, true]).slice(1)));

const data = loadData(DATA, fs);
const byLeague = {};
for (const m of data.matches) (byLeague[m.league] ??= []).push(m);
const enIndex = {}; // league → EN名索引
const enToJa = Object.entries(JA);
for (const lg of Object.keys(byLeague)) {
  const jaSet = new Set(byLeague[lg].flatMap(m => [m.home, m.away]));
  enIndex[lg] = buildIndex(enToJa.filter(([, ja]) => jaSet.has(ja)).map(([en]) => en));
}
const log = [];

if (args.only !== "finalize" && fs.existsSync(CORR)) {
  for (const f of readdirSync(CORR).filter(f => f.endsWith(".json")).sort()) {
    const c = JSON.parse(fs.readFileSync(join(CORR, f), "utf8"));
    let ok = 0, miss = 0;
    for (const x of c.matches || []) {
      const list = byLeague[x.league] || [];
      let home, away;
      if (x.home_en) {
        const h = matchTeam(enIndex[x.league] || [], x.home_en), a = matchTeam(enIndex[x.league] || [], x.away_en);
        home = h && JA[h]; away = a && JA[a];
      } else { home = jName(x.home); away = jName(x.away); }
      const m = list.find(m => m.matchday === x.matchday && m.home === home && m.away === away);
      if (!m) { miss++; log.push(`  ? ${f}: 該当なし ${x.league} MD${x.matchday} ${x.home_en || x.home} v ${x.away_en || x.away}`); continue; }
      m.utc = jstToUtc(x.jst_date, x.jst_time);
      if (x.jst_time) delete m.tbd; else m.tbd = true;
      delete m.dateTBD;
      if (x.venue) m.venue = x.venue;
      if (x.status === "POSTPONED") m.status = "POSTPONED";
      ok++;
    }
    log.push(`${f}: 適用${ok} / 該当なし${miss}`);
  }
}

// ---- 仕上げ: 消化状況の判定 ----
const now = Date.now();
let fin = 0, reopened = 0;
for (const m of data.matches) {
  const t = new Date(m.utc).getTime();
  if (!m.tbd && m.status === "SCHEDULED" && t + 150 * 60e3 < now) { m.status = "FINISHED"; fin++; }
  else if (m.status === "FINISHED" && t > now) { m.status = "SCHEDULED"; reopened++; } // 日程が後ろ倒しになった試合
}
log.push(`仕上げ: キックオフ経過により終了扱い${fin} / 未来日程に戻した${reopened}`);
saveData(DATA, fs, data);
console.log(log.join("\n"));
console.log(`✔ ${DATA} を更新（全${data.matches.length}試合、終了${data.matches.filter(m => m.status === "FINISHED").length}）`);
