#!/usr/bin/env node
// 日程データ更新スクリプト（Node 18+ / 依存パッケージなし）
//
//   欧州4リーグ … football-data.org v4 API（無料キー必須）
//                 環境変数 FOOTBALL_DATA_API_KEY にキーを設定して実行する
//                 キー取得: https://www.football-data.org/client/register
//   Ｊ１リーグ … Ｊリーグ公式データサイト（data.j-league.or.jp）の検索結果HTMLを解析
//
// 使い方:
//   FOOTBALL_DATA_API_KEY=xxxx node scripts/update.mjs
//   node scripts/update.mjs --no-eu            # Ｊリーグのみ更新
//   node scripts/update.mjs --no-j             # 欧州のみ更新
//   node scripts/update.mjs --season=2026      # 欧州のシーズン開始年（省略時はAPI既定=今季）
//   node scripts/update.mjs --jyears=2026,2027 # Ｊリーグの取得年度（秋春制で年をまたぐ場合は両方指定）
//   node scripts/update.mjs --out=path/to/matches.js
//
// 出力: data/matches.js（表示アプリが読み込むファイル）を丸ごと書き換える。

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const OUT = args.out ? String(args.out) : join(ROOT, "data", "matches.js");

const LEAGUES = [
  { id: "J1",  name: "明治安田Ｊ１リーグ", short: "Ｊ１",     country: "日本",       color: "#0e7d38" },
  { id: "J2",  name: "明治安田Ｊ２リーグ（コンサドーレのみ）", short: "Ｊ２札幌", country: "日本", color: "#145c30" },
  { id: "PL",  name: "プレミアリーグ",     short: "プレミア", country: "イングランド", color: "#38003c" },
  { id: "PD",  name: "ラ・リーガ",         short: "ラリーガ", country: "スペイン",   color: "#e07a00" },
  { id: "SA",  name: "セリエＡ",           short: "セリエＡ", country: "イタリア",   color: "#0066a7" },
  { id: "BL1", name: "ブンデスリーガ",     short: "ブンデス", country: "ドイツ",     color: "#d20515" }
];

// football-data.org の英語名 → 日本語表記（未収載はAPIの shortName をそのまま使う）
const JA = {
  // プレミアリーグ
  "Arsenal": "アーセナル", "Aston Villa": "アストン・ヴィラ", "Bournemouth": "ボーンマス",
  "Brentford": "ブレントフォード", "Brighton Hove": "ブライトン", "Brighton": "ブライトン",
  "Chelsea": "チェルシー", "Crystal Palace": "クリスタル・パレス", "Everton": "エヴァートン",
  "Fulham": "フラム", "Ipswich Town": "イプスウィッチ", "Leicester City": "レスター",
  "Liverpool": "リヴァプール", "Man City": "マンチェスター・シティ", "Man United": "マンチェスター・ユナイテッド",
  "Newcastle": "ニューカッスル", "Nottingham": "ノッティンガム・フォレスト", "Southampton": "サウサンプトン",
  "Tottenham": "トッテナム", "West Ham": "ウェストハム", "Wolverhampton": "ウルヴァーハンプトン",
  "Leeds United": "リーズ", "Burnley": "バーンリー", "Sunderland": "サンダーランド",
  // ラ・リーガ
  "Real Madrid": "レアル・マドリード", "Barça": "バルセロナ", "Barcelona": "バルセロナ",
  "Atleti": "アトレティコ・マドリード", "Atlético Madrid": "アトレティコ・マドリード",
  "Athletic": "アスレティック・ビルバオ", "Real Sociedad": "レアル・ソシエダ",
  "Betis": "ベティス", "Sevilla FC": "セビージャ", "Sevilla": "セビージャ",
  "Villarreal": "ビジャレアル", "Valencia": "バレンシア", "Celta": "セルタ",
  "Getafe": "ヘタフェ", "Girona": "ジローナ", "Osasuna": "オサスナ", "Mallorca": "マジョルカ",
  "Rayo Vallecano": "ラージョ・バジェカーノ", "Espanyol": "エスパニョール", "Alavés": "アラベス",
  "Leganés": "レガネス", "Valladolid": "バジャドリード", "Las Palmas": "ラス・パルマス",
  "Levante": "レバンテ", "Elche": "エルチェ", "Oviedo": "オビエド",
  // セリエＡ
  "Inter": "インテル", "Milan": "ミラン", "Juventus": "ユヴェントス", "Napoli": "ナポリ",
  "Roma": "ローマ", "Lazio": "ラツィオ", "Atalanta": "アタランタ", "Fiorentina": "フィオレンティーナ",
  "Bologna": "ボローニャ", "Torino": "トリノ", "Udinese": "ウディネーゼ", "Genoa": "ジェノア",
  "Cagliari": "カリアリ", "Verona": "ヴェローナ", "Parma": "パルマ", "Como": "コモ",
  "Lecce": "レッチェ", "Empoli": "エンポリ", "Monza": "モンツァ", "Venezia": "ヴェネツィア",
  "Sassuolo": "サッスオーロ", "Pisa": "ピサ", "Cremonese": "クレモネーゼ",
  // ブンデスリーガ
  "Bayern": "バイエルン", "Dortmund": "ドルトムント", "Leverkusen": "レバークーゼン",
  "RB Leipzig": "ライプツィヒ", "Frankfurt": "フランクフルト", "Stuttgart": "シュトゥットガルト",
  "M'gladbach": "ボルシアＭＧ", "Wolfsburg": "ヴォルフスブルク", "Freiburg": "フライブルク",
  "Union Berlin": "ウニオン・ベルリン", "Mainz": "マインツ", "Augsburg": "アウクスブルク",
  "Werder": "ヴェルダー・ブレーメン", "Hoffenheim": "ホッフェンハイム", "Bochum": "ボーフム",
  "Heidenheim": "ハイデンハイム", "St. Pauli": "ザンクト・パウリ", "Holstein Kiel": "ホルシュタイン・キール",
  "Hamburg": "ハンブルガーＳＶ", "Köln": "ケルン"
};
const ja = t => JA[t?.shortName] || JA[t?.name] || t?.shortName || t?.name || "不明";

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 欧州4リーグ（football-data.org） ----------
async function fetchEurope() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    console.warn("⚠ FOOTBALL_DATA_API_KEY が未設定のため欧州リーグをスキップします。");
    console.warn("  無料キー: https://www.football-data.org/client/register");
    return [];
  }
  const codes = ["PL", "PD", "SA", "BL1"];
  const out = [];
  for (const code of codes) {
    const url = new URL(`https://api.football-data.org/v4/competitions/${code}/matches`);
    if (args.season) url.searchParams.set("season", String(args.season));
    process.stdout.write(`  ${code} を取得中 ... `);
    const res = await fetch(url, { headers: { "X-Auth-Token": key } });
    if (!res.ok) {
      console.warn(`失敗 (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const json = await res.json();
    let n = 0;
    for (const m of json.matches || []) {
      if (!m.utcDate) continue;
      const ft = m.score?.fullTime;
      out.push({
        league: code,
        matchday: m.matchday ?? undefined,
        utc: m.utcDate,
        home: ja(m.homeTeam),
        away: ja(m.awayTeam),
        venue: m.venue || undefined,
        status: m.status || "SCHEDULED",
        score: (ft && ft.home != null) ? `${ft.home}-${ft.away}` : undefined
      });
      n++;
    }
    console.log(`${n}試合`);
    await sleep(6500); // 無料枠 10リクエスト/分 対策
  }
  return out;
}

// ---------- Ｊ１リーグ（Ｊリーグ公式データサイトのHTML解析） ----------
// 検索結果テーブルの列構成が変わった場合はこの関数を修正すること。
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function parseJleagueHtml(html, seasonYear, leagueId = "J1") {
  const rows = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  for (const trm of html.match(trRe) || []) {
    const cells = [...trm.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => stripTags(c[1]));
    if (cells.length < 8) continue;
    const dateIdx = cells.findIndex(c => /^\d{2}\/\d{2}/.test(c));
    if (dateIdx < 0) continue;
    const date = cells[dateIdx];                       // "08/22(土)"
    const time = cells[dateIdx + 1] || "";             // "19:00" / "未定"
    const home = cells[dateIdx + 2] || "";
    const scoreCell = cells[dateIdx + 3] || "";        // "1-0" / "vs"
    const away = cells[dateIdx + 4] || "";
    const venue = cells[dateIdx + 5] || "";
    const secCell = cells.find(c => /第\s*\d+\s*節/.test(c)) || "";
    const md = secCell.match(/第\s*(\d+)\s*節/);
    const dm = date.match(/^(\d{2})\/(\d{2})/);
    if (!dm || !home || !away) continue;
    const [, MM, DD] = dm;
    // 秋春制で年度が年をまたぐ場合の暫定判定: 6月以前は翌年扱い
    const year = Number(MM) >= 6 ? seasonYear : seasonYear + 1;
    const tbd = !/^\d{1,2}:\d{2}$/.test(time);
    const [hh, mm] = tbd ? [15, 0] : time.split(":").map(Number);
    const utc = new Date(Date.UTC(year, Number(MM) - 1, Number(DD), hh - 9, mm)); // JST→UTC
    const sc = scoreCell.match(/^(\d+)\s*-\s*(\d+)$/);
    rows.push({
      league: leagueId,
      matchday: md ? Number(md[1]) : undefined,
      utc: utc.toISOString(),
      home, away,
      venue: venue || undefined,
      status: sc ? "FINISHED" : "SCHEDULED",
      score: sc ? `${sc[1]}-${sc[2]}` : undefined,
      tbd: tbd || undefined
    });
  }
  return rows;
}
async function fetchJleague() {
  const years = String(args.jyears || new Date().getFullYear()).split(",").map(s => Number(s.trim()));
  // Ｊ２は北海道コンサドーレ札幌の試合のみ収録する
  const DIVS = [
    { frame: 1, league: "J1", label: "Ｊ１" },
    { frame: 2, league: "J2", label: "Ｊ２(コンサドーレ)", only: /コンサドーレ/ }
  ];
  const out = [];
  for (const div of DIVS) {
    for (const y of years) {
      const url = `https://data.j-league.or.jp/SFMS01/search?competition_years=${y}&competition_frame_ids=${div.frame}`;
      process.stdout.write(`  ${div.label} ${y}年度 を取得中 ... `);
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (schedule-app personal use)" } });
        if (!res.ok) { console.warn(`失敗 (HTTP ${res.status})`); continue; }
        let rows = parseJleagueHtml(await res.text(), y, div.league);
        if (rows.length === 0) console.warn("  ⚠ 0件でした。サイト構成が変わった可能性があります（parseJleagueHtml を確認）。");
        if (div.only) rows = rows.filter(m => div.only.test(m.home + m.away));
        console.log(`${rows.length}試合`);
        out.push(...rows);
        await sleep(2000);
      } catch (e) {
        console.warn(`失敗: ${e.message}`);
      }
    }
  }
  // 年をまたいで重複した試合を除去
  const seen = new Set();
  return out.filter(m => {
    const k = m.utc.slice(0, 10) + m.home + m.away;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- 本体 ----------
const matches = [];
if (!args["no-eu"]) { console.log("欧州リーグ:"); matches.push(...await fetchEurope()); }
if (!args["no-j"])  { console.log("Ｊリーグ:");   matches.push(...await fetchJleague()); }

if (matches.length === 0) {
  console.error("\n取得できた試合が0件のため、既存ファイルは変更しませんでした。");
  process.exit(1);
}

// 片側だけ更新した場合、もう片側は既存データを引き継ぐ
if (existsSync(OUT) && (args["no-eu"] || args["no-j"])) {
  try {
    const prev = readFileSync(OUT, "utf8").match(/window\.SCHEDULE_DATA\s*=\s*([\s\S]*?);\s*$/);
    if (prev) {
      const old = JSON.parse(prev[1].replace(/,\s*([}\]])/g, "$1"));
      if (!old.sample) {
        const fetched = new Set(matches.map(m => m.league));
        matches.push(...(old.matches || []).filter(m => !fetched.has(m.league)));
        console.log("（未取得リーグは既存データを維持）");
      }
    }
  } catch { /* 引き継ぎ失敗時は取得分のみで出力 */ }
}

matches.sort((a, b) => a.utc.localeCompare(b.utc) || a.league.localeCompare(b.league));
const data = {
  generatedAt: new Date().toISOString(),
  sample: false,
  leagues: LEAGUES,
  matches
};
writeFileSync(OUT,
  "// scripts/update.mjs により自動生成。手で編集しないこと。\n" +
  "window.SCHEDULE_DATA = " + JSON.stringify(data, null, 1) + ";\n");
console.log(`\n✔ ${OUT} を更新しました（全${matches.length}試合）`);
