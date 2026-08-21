// 日程データ（scripts/update.mjs が上書き生成する）
// sample:true の間はデモ用のダミー日程。実データ取得は README を参照。
// utc は UTC のキックオフ時刻。表示側で Asia/Tokyo に変換する。
window.SCHEDULE_DATA = {
  generatedAt: "2026-08-21T03:00:00Z",
  sample: true,
  leagues: [
    { id: "J1", name: "明治安田Ｊ１リーグ", short: "Ｊ１", country: "日本", color: "#0e7d38" },
    { id: "J2", name: "明治安田Ｊ２リーグ（コンサドーレのみ）", short: "Ｊ２札幌", country: "日本", color: "#145c30" },
    { id: "PL", name: "プレミアリーグ", short: "プレミア", country: "イングランド", color: "#38003c" },
    { id: "PD", name: "ラ・リーガ", short: "ラリーガ", country: "スペイン", color: "#e07a00" },
    { id: "SA", name: "セリエＡ", short: "セリエＡ", country: "イタリア", color: "#0066a7" },
    { id: "BL1", name: "ブンデスリーガ", short: "ブンデス", country: "ドイツ", color: "#d20515" }
  ],
  matches: [
    // ---- 終了済みの例（結果表示の確認用） ----
    { league: "PL",  matchday: 1, utc: "2026-08-14T19:00:00Z", home: "リヴァプール", away: "ボーンマス", venue: "アンフィールド", status: "FINISHED", score: "4-2" },
    { league: "PL",  matchday: 1, utc: "2026-08-15T14:00:00Z", home: "アストン・ヴィラ", away: "ニューカッスル", venue: "ヴィラ・パーク", status: "FINISHED", score: "0-0" },
    { league: "PL",  matchday: 1, utc: "2026-08-15T16:30:00Z", home: "アーセナル", away: "ウルヴァーハンプトン", venue: "エミレーツ・スタジアム", status: "FINISHED", score: "2-0" },
    { league: "PL",  matchday: 1, utc: "2026-08-16T15:30:00Z", home: "チェルシー", away: "クリスタル・パレス", venue: "スタンフォード・ブリッジ", status: "FINISHED", score: "1-1" },
    { league: "PD",  matchday: 1, utc: "2026-08-15T19:30:00Z", home: "バルセロナ", away: "マジョルカ", venue: "エスタディ・オリンピック", status: "FINISHED", score: "3-0" },
    { league: "PD",  matchday: 1, utc: "2026-08-16T19:30:00Z", home: "レアル・マドリード", away: "オサスナ", venue: "サンティアゴ・ベルナベウ", status: "FINISHED", score: "2-1" },
    { league: "J1",  matchday: 1, utc: "2026-08-15T10:00:00Z", home: "鹿島アントラーズ", away: "浦和レッズ", venue: "県立カシマサッカースタジアム", status: "FINISHED", score: "1-0" },
    { league: "J1",  matchday: 1, utc: "2026-08-15T10:00:00Z", home: "ヴィッセル神戸", away: "サンフレッチェ広島", venue: "ノエビアスタジアム神戸", status: "FINISHED", score: "2-2" },
    { league: "J1",  matchday: 1, utc: "2026-08-16T09:00:00Z", home: "川崎フロンターレ", away: "ＦＣ東京", venue: "Ｕｖａｎｃｅとどろきスタジアム", status: "FINISHED", score: "3-1" },
    { league: "J2",  matchday: 1, utc: "2026-08-16T04:00:00Z", home: "北海道コンサドーレ札幌", away: "ベガルタ仙台", venue: "大和ハウス プレミストドーム", status: "FINISHED", score: "2-1" },

    // ---- 今週末（予定） ----
    { league: "BL1", matchday: 1, utc: "2026-08-21T18:30:00Z", home: "バイエルン", away: "ライプツィヒ", venue: "アリアンツ・アレーナ", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-22T09:30:00Z", home: "アルビレックス新潟", away: "清水エスパルス", venue: "デンカビッグスワンスタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-22T10:00:00Z", home: "浦和レッズ", away: "横浜Ｆ・マリノス", venue: "埼玉スタジアム２００２", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-22T10:00:00Z", home: "ＦＣ町田ゼルビア", away: "柏レイソル", venue: "町田ＧＩＯＮスタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-22T10:00:00Z", home: "名古屋グランパス", away: "ガンバ大阪", venue: "豊田スタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-23T09:00:00Z", home: "セレッソ大阪", away: "京都サンガF.C.", venue: "ヨドコウ桜スタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 2, utc: "2026-08-23T10:00:00Z", home: "アビスパ福岡", away: "湘南ベルマーレ", venue: "ベスト電器スタジアム", status: "SCHEDULED" },
    { league: "J2",  matchday: 2, utc: "2026-08-23T05:00:00Z", home: "ジェフユナイテッド千葉", away: "北海道コンサドーレ札幌", venue: "フクダ電子アリーナ", status: "SCHEDULED" },
    { league: "PL",  matchday: 2, utc: "2026-08-22T11:30:00Z", home: "マンチェスター・シティ", away: "トッテナム", venue: "エティハド・スタジアム", status: "SCHEDULED" },
    { league: "PL",  matchday: 2, utc: "2026-08-22T14:00:00Z", home: "ブライトン", away: "エヴァートン", venue: "アメックス・スタジアム", status: "SCHEDULED" },
    { league: "PL",  matchday: 2, utc: "2026-08-22T14:00:00Z", home: "ニューカッスル", away: "ブレントフォード", venue: "セント・ジェームズ・パーク", status: "SCHEDULED" },
    { league: "PL",  matchday: 2, utc: "2026-08-22T16:30:00Z", home: "マンチェスター・ユナイテッド", away: "フラム", venue: "オールド・トラッフォード", status: "SCHEDULED" },
    { league: "PL",  matchday: 2, utc: "2026-08-23T15:30:00Z", home: "リヴァプール", away: "アーセナル", venue: "アンフィールド", status: "SCHEDULED" },
    { league: "BL1", matchday: 1, utc: "2026-08-22T13:30:00Z", home: "ドルトムント", away: "フランクフルト", venue: "ジグナル・イドゥナ・パルク", status: "SCHEDULED" },
    { league: "BL1", matchday: 1, utc: "2026-08-22T13:30:00Z", home: "シュトゥットガルト", away: "フライブルク", venue: "ＭＨＰアレーナ", status: "SCHEDULED" },
    { league: "BL1", matchday: 1, utc: "2026-08-22T16:30:00Z", home: "レバークーゼン", away: "ボルシアＭＧ", venue: "バイアレーナ", status: "SCHEDULED" },
    { league: "BL1", matchday: 1, utc: "2026-08-23T13:30:00Z", home: "ヴォルフスブルク", away: "ウニオン・ベルリン", venue: "フォルクスワーゲン・アレーナ", status: "SCHEDULED" },
    { league: "PD",  matchday: 2, utc: "2026-08-22T17:00:00Z", home: "アトレティコ・マドリード", away: "セビージャ", venue: "メトロポリターノ", status: "SCHEDULED" },
    { league: "PD",  matchday: 2, utc: "2026-08-22T19:30:00Z", home: "レアル・ソシエダ", away: "バレンシア", venue: "レアレ・アレーナ", status: "SCHEDULED" },
    { league: "PD",  matchday: 2, utc: "2026-08-23T19:30:00Z", home: "ベティス", away: "アスレティック・ビルバオ", venue: "ベニート・ビジャマリン", status: "SCHEDULED" },
    { league: "SA",  matchday: 1, utc: "2026-08-22T16:30:00Z", home: "インテル", away: "トリノ", venue: "サン・シーロ", status: "SCHEDULED" },
    { league: "SA",  matchday: 1, utc: "2026-08-22T18:45:00Z", home: "ナポリ", away: "ボローニャ", venue: "スタディオ・マラドーナ", status: "SCHEDULED" },
    { league: "SA",  matchday: 1, utc: "2026-08-23T16:30:00Z", home: "ユヴェントス", away: "フィオレンティーナ", venue: "アリアンツ・スタジアム", status: "SCHEDULED" },
    { league: "SA",  matchday: 1, utc: "2026-08-23T18:45:00Z", home: "ミラン", away: "ローマ", venue: "サン・シーロ", status: "SCHEDULED" },
    { league: "SA",  matchday: 1, utc: "2026-08-23T18:45:00Z", home: "アタランタ", away: "ラツィオ", venue: "ジェイビス・スタジアム", status: "SCHEDULED" },

    // ---- 翌週末 ----
    { league: "J1",  matchday: 3, utc: "2026-08-29T10:00:00Z", home: "柏レイソル", away: "鹿島アントラーズ", venue: "三協フロンテア柏スタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 3, utc: "2026-08-29T10:00:00Z", home: "横浜Ｆ・マリノス", away: "川崎フロンターレ", venue: "日産スタジアム", status: "SCHEDULED" },
    { league: "J1",  matchday: 3, utc: "2026-08-29T10:00:00Z", home: "サンフレッチェ広島", away: "ファジアーノ岡山", venue: "エディオンピースウイング広島", status: "SCHEDULED" },
    { league: "J1",  matchday: 3, utc: "2026-08-30T10:00:00Z", home: "ＦＣ東京", away: "ヴィッセル神戸", venue: "味の素スタジアム", status: "SCHEDULED" },
    { league: "J2",  matchday: 3, utc: "2026-08-29T04:00:00Z", home: "北海道コンサドーレ札幌", away: "Ｖ・ファーレン長崎", venue: "大和ハウス プレミストドーム", status: "SCHEDULED" },
    { league: "PL",  matchday: 3, utc: "2026-08-29T14:00:00Z", home: "トッテナム", away: "ウェストハム", venue: "トッテナム・ホットスパー・スタジアム", status: "SCHEDULED" },
    { league: "PL",  matchday: 3, utc: "2026-08-29T14:00:00Z", home: "エヴァートン", away: "リヴァプール", venue: "ヒル・ディキンソン・スタジアム", status: "SCHEDULED" },
    { league: "PL",  matchday: 3, utc: "2026-08-29T16:30:00Z", home: "アーセナル", away: "マンチェスター・シティ", venue: "エミレーツ・スタジアム", status: "SCHEDULED" },
    { league: "PL",  matchday: 3, utc: "2026-08-30T15:30:00Z", home: "クリスタル・パレス", away: "チェルシー", venue: "セルハースト・パーク", status: "SCHEDULED" },
    { league: "BL1", matchday: 2, utc: "2026-08-28T18:30:00Z", home: "ライプツィヒ", away: "シュトゥットガルト", venue: "レッドブル・アレーナ", status: "SCHEDULED" },
    { league: "BL1", matchday: 2, utc: "2026-08-29T13:30:00Z", home: "フランクフルト", away: "バイエルン", venue: "ドイチェ・バンク・パルク", status: "SCHEDULED" },
    { league: "BL1", matchday: 2, utc: "2026-08-29T13:30:00Z", home: "ボルシアＭＧ", away: "ヴェルダー・ブレーメン", venue: "ボルシア・パルク", status: "SCHEDULED" },
    { league: "BL1", matchday: 2, utc: "2026-08-29T16:30:00Z", home: "フライブルク", away: "ドルトムント", venue: "ヨーロッパ・パルク・シュタディオン", status: "SCHEDULED" },
    { league: "PD",  matchday: 3, utc: "2026-08-29T17:00:00Z", home: "バルセロナ", away: "ベティス", venue: "エスタディ・オリンピック", status: "SCHEDULED" },
    { league: "PD",  matchday: 3, utc: "2026-08-29T19:30:00Z", home: "ビジャレアル", away: "レアル・マドリード", venue: "エスタディオ・デ・ラ・セラミカ", status: "SCHEDULED" },
    { league: "PD",  matchday: 3, utc: "2026-08-30T19:30:00Z", home: "セビージャ", away: "レアル・ソシエダ", venue: "ラモン・サンチェス・ピスフアン", status: "SCHEDULED" },
    { league: "SA",  matchday: 2, utc: "2026-08-29T16:30:00Z", home: "ボローニャ", away: "ミラン", venue: "スタディオ・ダッラーラ", status: "SCHEDULED" },
    { league: "SA",  matchday: 2, utc: "2026-08-29T18:45:00Z", home: "ローマ", away: "インテル", venue: "スタディオ・オリンピコ", status: "SCHEDULED" },
    { league: "SA",  matchday: 2, utc: "2026-08-30T18:45:00Z", home: "フィオレンティーナ", away: "ナポリ", venue: "スタディオ・アルテミオ・フランキ", status: "SCHEDULED" },

    // ---- 時刻未定の例 ----
    { league: "J1",  matchday: 4, utc: "2026-09-05T15:00:00Z", home: "京都サンガF.C.", away: "ＦＣ町田ゼルビア", venue: "サンガスタジアム by KYOCERA", status: "SCHEDULED", tbd: true },
    { league: "J1",  matchday: 4, utc: "2026-09-05T15:00:00Z", home: "湘南ベルマーレ", away: "アルビレックス新潟", venue: "レモンガススタジアム平塚", status: "SCHEDULED", tbd: true },
    { league: "J2",  matchday: 4, utc: "2026-09-06T15:00:00Z", home: "モンテディオ山形", away: "北海道コンサドーレ札幌", venue: "ＮＤソフトスタジアム山形", status: "SCHEDULED", tbd: true }
  ]
};
