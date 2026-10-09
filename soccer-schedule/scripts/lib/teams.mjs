// クラブ名の対訳・照合ユーティリティ（update-europe.mjs / apply-corrections.mjs が共用）

// openfootball の正式名 → 日本語表記
export const JA = {
  // プレミアリーグ
  "AFC Bournemouth": "ボーンマス", "Arsenal FC": "アーセナル", "Aston Villa FC": "アストン・ヴィラ",
  "Brentford FC": "ブレントフォード", "Brighton & Hove Albion FC": "ブライトン", "Chelsea FC": "チェルシー",
  "Coventry City FC": "コベントリー", "Crystal Palace FC": "クリスタル・パレス", "Everton FC": "エヴァートン",
  "Fulham FC": "フラム", "Hull City AFC": "ハル・シティ", "Ipswich Town FC": "イプスウィッチ",
  "Leeds United FC": "リーズ", "Liverpool FC": "リヴァプール", "Manchester City FC": "マンチェスター・シティ",
  "Manchester United FC": "マンチェスター・ユナイテッド", "Newcastle United FC": "ニューカッスル",
  "Nottingham Forest FC": "ノッティンガム・フォレスト", "Sunderland AFC": "サンダーランド",
  "Tottenham Hotspur FC": "トッテナム",
  // ラ・リーガ
  "Athletic Club": "アスレティック・ビルバオ", "CA Osasuna": "オサスナ", "Club Atlético de Madrid": "アトレティコ・マドリード",
  "Deportivo Alavés": "アラベス", "Elche CF": "エルチェ", "FC Barcelona": "バルセロナ", "Getafe CF": "ヘタフェ",
  "Levante UD": "レバンテ", "Málaga CF": "マラガ", "RC Celta de Vigo": "セルタ",
  "RC Deportivo La Coruña": "デポルティボ", "RCD Espanyol de Barcelona": "エスパニョール",
  "Rayo Vallecano de Madrid": "ラージョ・バジェカーノ", "Real Betis Balompié": "ベティス",
  "Real Madrid CF": "レアル・マドリード", "Real Racing Club de Santander": "ラシン・サンタンデール",
  "Real Sociedad de Fútbol": "レアル・ソシエダ", "Sevilla FC": "セビージャ", "Valencia CF": "バレンシア",
  "Villarreal CF": "ビジャレアル",
  // セリエＡ
  "AC Milan": "ミラン", "AC Monza": "モンツァ", "ACF Fiorentina": "フィオレンティーナ", "AS Roma": "ローマ",
  "Atalanta BC": "アタランタ", "Bologna FC 1909": "ボローニャ", "Cagliari Calcio": "カリアリ", "Como 1907": "コモ",
  "FC Internazionale Milano": "インテル", "Frosinone Calcio": "フロジノーネ", "Genoa CFC": "ジェノア",
  "Juventus FC": "ユヴェントス", "Parma Calcio 1913": "パルマ", "SS Lazio": "ラツィオ", "SSC Napoli": "ナポリ",
  "Torino FC": "トリノ", "US Lecce": "レッチェ", "US Sassuolo Calcio": "サッスオーロ",
  "Udinese Calcio": "ウディネーゼ", "Venezia FC": "ヴェネツィア",
  // ブンデスリーガ
  "1. FC Köln": "ケルン", "1. FC Union Berlin": "ウニオン・ベルリン", "1. FSV Mainz 05": "マインツ",
  "Bayer 04 Leverkusen": "レバークーゼン", "Borussia Dortmund": "ドルトムント",
  "Borussia Mönchengladbach": "ボルシアＭＧ", "Eintracht Frankfurt": "フランクフルト", "FC Augsburg": "アウクスブルク",
  "FC Bayern München": "バイエルン", "FC Schalke 04": "シャルケ", "Hamburger SV": "ハンブルガーＳＶ",
  "RB Leipzig": "ライプツィヒ", "SC Freiburg": "フライブルク", "SC Paderborn 07": "パーダーボルン",
  "SV 07 Elversberg": "エルフェアスベルク", "SV Werder Bremen": "ヴェルダー・ブレーメン",
  "TSG 1899 Hoffenheim": "ホッフェンハイム", "VfB Stuttgart": "シュトゥットガルト",
  // リーグ・アン
  "AJ Auxerre": "オセール", "AS Monaco FC": "モナコ", "Angers SCO": "アンジェ", "ES Troyes AC": "トロワ",
  "FC Lorient": "ロリアン", "Le Havre AC": "ル・アーヴル", "Le Mans FC": "ル・マン", "Lille OSC": "リール",
  "OGC Nice": "ニース", "Olympique Lyonnais": "リヨン", "Olympique de Marseille": "マルセイユ",
  "Paris FC": "パリＦＣ", "Paris Saint-Germain FC": "パリ・サンジェルマン", "RC Strasbourg Alsace": "ストラスブール",
  "Racing Club de Lens": "ランス", "Stade Brestois 29": "ブレスト", "Stade Rennais FC 1901": "レンヌ",
  "Toulouse FC": "トゥールーズ"
};

// ホームスタジアム（新規に現れた試合にだけ使う。既存データの会場は維持）
export const VENUE = {
  "アーセナル": "エミレーツ・スタジアム", "アストン・ヴィラ": "ヴィラ・パーク", "ボーンマス": "バイタリティ・スタジアム",
  "ブレントフォード": "Gtechコミュニティ・スタジアム", "ブライトン": "アメックス・スタジアム",
  "チェルシー": "スタンフォード・ブリッジ", "クリスタル・パレス": "セルハースト・パーク",
  "エヴァートン": "ヒル・ディキンソン・スタジアム", "フラム": "クレイヴン・コテージ",
  "ハル・シティ": "ＭＫＭスタジアム", "イプスウィッチ": "ポートマン・ロード", "リーズ": "エランド・ロード",
  "リヴァプール": "アンフィールド", "マンチェスター・シティ": "エティハド・スタジアム",
  "マンチェスター・ユナイテッド": "オールド・トラッフォード", "ニューカッスル": "セント・ジェームズ・パーク",
  "ノッティンガム・フォレスト": "シティ・グラウンド", "サンダーランド": "スタジアム・オブ・ライト",
  "トッテナム": "トッテナム・ホットスパー・スタジアム", "コベントリー": "ＣＢＳアリーナ",
  "アスレティック・ビルバオ": "サン・マメス", "オサスナ": "エル・サダル", "アトレティコ・マドリード": "メトロポリターノ",
  "アラベス": "メンディソローサ", "エルチェ": "マルティネス・バレロ", "ヘタフェ": "コリセウム",
  "レバンテ": "シウタット・デ・バレンシア", "マラガ": "ラ・ロサレダ", "セルタ": "バライードス",
  "デポルティボ": "リアソール", "エスパニョール": "ＲＣＤＥスタジアム", "ラージョ・バジェカーノ": "バジェカス",
  "レアル・マドリード": "サンティアゴ・ベルナベウ", "ラシン・サンタンデール": "エル・サルディネロ",
  "レアル・ソシエダ": "レアレ・アレーナ", "セビージャ": "ラモン・サンチェス・ピスフアン",
  "バレンシア": "メスタージャ", "ビジャレアル": "エスタディオ・デ・ラ・セラミカ",
  "ミラン": "サン・シーロ", "インテル": "サン・シーロ", "モンツァ": "ウ・パワー・スタジアム",
  "フィオレンティーナ": "アルテミオ・フランキ", "ローマ": "スタディオ・オリンピコ", "ラツィオ": "スタディオ・オリンピコ",
  "アタランタ": "ジェイビス・スタジアム", "ボローニャ": "レナート・ダッラーラ", "カリアリ": "ウニポル・ドムス",
  "コモ": "ジュゼッペ・シニガリア", "フロジノーネ": "ベニート・スティルペ", "ジェノア": "ルイジ・フェッラーリス",
  "ユヴェントス": "アリアンツ・スタジアム", "パルマ": "エンニオ・タルディーニ", "ナポリ": "スタディオ・マラドーナ",
  "トリノ": "スタディオ・オリンピコ・グランデ・トリノ", "レッチェ": "ヴィア・デル・マーレ",
  "サッスオーロ": "マペイ・スタジアム", "ウディネーゼ": "ブルーエナジー・スタジアム", "ヴェネツィア": "ピエルルイジ・ペンツォ",
  "ケルン": "ラインエネルギーシュタディオン", "ウニオン・ベルリン": "アルテ・フェルスターライ",
  "マインツ": "メーヴァ・アレーナ", "レバークーゼン": "バイアレーナ", "ドルトムント": "ジグナル・イドゥナ・パルク",
  "ボルシアＭＧ": "ボルシア・パルク", "フランクフルト": "ドイチェ・バンク・パルク", "アウクスブルク": "ＷＷＫアレーナ",
  "バイエルン": "アリアンツ・アレーナ", "シャルケ": "フェルティンス・アレーナ", "ハンブルガーＳＶ": "フォルクスパルクシュタディオン",
  "ライプツィヒ": "レッドブル・アレーナ", "フライブルク": "ヨーロッパ・パルク・シュタディオン",
  "パーダーボルン": "ホーム・デルーフ・アレーナ", "エルフェアスベルク": "ウルスアパルク",
  "ヴェルダー・ブレーメン": "ヴェーザーシュタディオン", "ホッフェンハイム": "プレゼロ・アレーナ",
  "シュトゥットガルト": "ＭＨＰアレーナ",
  "パリ・サンジェルマン": "パルク・デ・プランス", "マルセイユ": "スタッド・ヴェロドローム", "リヨン": "グルパマ・スタジアム",
  "モナコ": "スタッド・ルイ２世", "リール": "スタッド・ピエール・モーロワ", "ニース": "アリアンツ・リビエラ",
  "ランス": "スタッド・ボラール＝ドレリス", "レンヌ": "ロアゾン・パルク", "ストラスブール": "スタッド・ド・ラ・メノー",
  "トゥールーズ": "スタジアム・ド・トゥールーズ", "ブレスト": "スタッド・フランシス・ル・ブレ", "オセール": "スタッド・アベ・デシャン",
  "アンジェ": "スタッド・レイモン・コパ", "ル・アーヴル": "スタッド・オセアン", "ロリアン": "スタッド・デュ・ムストワール",
  "パリＦＣ": "スタッド・ジャン・ブアン", "トロワ": "スタッド・ド・ローブ", "ル・マン": "ＭＭＡレナ"
};

// ---- 英語名のゆるい照合（"Man City" → "Manchester City FC" 等） ----
const GENERIC = new Set(["fc","afc","cf","cfc","ac","as","us","ss","ssc","acf","bc","sc","sv","ca","rc","rcd","ud","club","calcio","balompie","futbol","de","del","la","und","1","07","04","05","1899","1909","1913","1907","vfb","tsg","fsv","rb","the","es","ogc","sco","aj","osc","olympique","racing"]);
const ALIAS = { man: "manchester", inter: "internazionale", gladbach: "monchengladbach", cologne: "koln", munich: "munchen",
  spurs: "tottenham", wolves: "wolverhampton", atleti: "atletico", lyon: "lyonnais", brest: "brestois", rennes: "rennais", psg: "germain",
  bilbao: "athletic", forest: "forest" };
export function tokens(name) {
  return new Set(String(name).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean)
    .map(w => ALIAS[w] || w).filter(w => !GENERIC.has(w)));
}
export function buildIndex(names) { return names.map(n => ({ name: n, tok: tokens(n) })); }
export function matchTeam(index, name) {
  const q = tokens(name);
  let best = null, bestScore = 0, bestExtra = Infinity, tie = false;
  for (const e of index) {
    let s = 0; for (const w of q) if (e.tok.has(w)) s++;
    const extra = e.tok.size - s;
    if (s > bestScore || (s === bestScore && s > 0 && extra < bestExtra)) { best = e.name; bestScore = s; bestExtra = extra; tie = false; }
    else if (s === bestScore && s > 0 && extra === bestExtra && e.name !== best) tie = true;
  }
  return bestScore > 0 && !tie ? best : null;
}

// ---- 日本語クラブ名の正規化（Ｊリーグ） ----
const J_ALIASES = [
  ["鹿島アントラーズ", "鹿島"], ["浦和レッズ", "浦和", "浦和レッドダイヤモンズ"], ["柏レイソル", "柏"],
  ["ＦＣ東京", "FC東京"], ["東京ヴェルディ", "東京V", "東京Ｖ", "ヴェルディ"],
  ["ＦＣ町田ゼルビア", "FC町田ゼルビア", "町田", "町田ゼルビア"], ["川崎フロンターレ", "川崎F", "川崎Ｆ", "川崎"],
  ["横浜Ｆ・マリノス", "横浜F・マリノス", "横浜FM", "横浜ＦＭ", "マリノス"],
  ["名古屋グランパス", "名古屋"], ["京都サンガF.C.", "京都サンガ", "京都"], ["ガンバ大阪", "G大阪", "Ｇ大阪"],
  ["セレッソ大阪", "C大阪", "Ｃ大阪"], ["ヴィッセル神戸", "神戸"], ["サンフレッチェ広島", "広島"],
  ["ファジアーノ岡山", "岡山"], ["アビスパ福岡", "福岡"], ["清水エスパルス", "清水"],
  ["水戸ホーリーホック", "水戸"], ["Ｖ・ファーレン長崎", "V・ファーレン長崎", "長崎"],
  ["ジェフユナイテッド千葉", "ジェフユナイテッド市原・千葉", "千葉", "ジェフ千葉"],
  ["北海道コンサドーレ札幌", "コンサドーレ札幌", "札幌", "コンサドーレ"],
];
const J_CANON = {};
export const normJ = s => String(s).normalize("NFKC").replace(/[\s・．.]/g, "").toLowerCase();
for (const row of J_ALIASES) for (const a of row) J_CANON[normJ(a)] = row[0];
export function jName(s) { return J_CANON[normJ(s)] || String(s).normalize("NFC").trim(); }

// ---- 共通 ----
export const jstToUtc = (date, time) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mi] = time ? time.split(":").map(Number) : [15, 0];
  return new Date(Date.UTC(y, m - 1, d, hh - 9, mi)).toISOString().replace(".000Z", "Z");
};
export function loadData(path, fs) {
  const src = fs.readFileSync(path, "utf8");
  return JSON.parse(src.match(/window\.SCHEDULE_DATA\s*=\s*([\s\S]*?);\s*$/)[1]);
}
export function saveData(path, fs, data) {
  data.matches = data.matches
    .map(m => ({ ...m, score: undefined })) // ネタバレ防止: スコアは絶対に保存しない
    .map(m => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)))
    .sort((a, b) => a.utc.localeCompare(b.utc) || a.league.localeCompare(b.league));
  data.generatedAt = new Date().toISOString();
  fs.writeFileSync(path, "// scripts/update*.mjs により自動生成。手で編集しないこと。\nwindow.SCHEDULE_DATA = " + JSON.stringify(data, null, 1) + ";\n");
}
