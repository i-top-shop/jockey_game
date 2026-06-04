/**
 * バランス回帰チェック（物理・固有・距離まわりを変更したら必ず実行）
 *   node sims/balance_check.js [レース数/距離]   省略時 1200
 *
 * ■ 合格目安（2026-06 検証済みベースライン / drain BASE=0.34）
 *   時計        : 1200m≈64s / 1600m≈86s / 2000m≈111s（±3s。体感は÷timeScale1.5）
 *   脚質        : 1200mは前有利（逃+先 ≥ 50%）/ 2000mは差し+追込 ≥ 55% が出ること
 *                 どの脚質も 10%未満に沈まない（追込は1200mのみ例外で~12%まで許容）
 *   スタミナ切れ: 1600m ≤ 4頭 / 2000m ≤ 8頭（12頭中、minSta<4）
 *   距離適性    : ◎(±200m) 9〜11% / ×(600m以上ズレ) 5〜7%（平均8.3%）
 *   固有        : 全12種が 6〜12% に収まる（どれかが13%超えたら調整）
 */
const { runMany, ABK } = require("./engine");
const N = parseInt(process.argv[2]||"1200",10);
const AB_JA={rocket:"ロケット",settle:"折り合い",burst:"末脚爆発",breaker:"馬群突破",corner:"コーナー巧者",stayer:"スタミナ王",fighter:"勝負根性",widerush:"大外一気",frontsoul:"逃げ魂",hotblood:"剛腕気性",mud:"雨の鬼",fast:"高速巧者"};

for(const DIST of [1200,1600,2000]){
  const r=runMany(DIST,N);
  const s=r.styles, pct=k=>(s[k]/N*100).toFixed(0);
  console.log(`\n=== ${DIST}m （${N}レース） ===`);
  console.log(`勝ちタイム平均: ${r.time.toFixed(1)}s`);
  console.log(`脚質勝率: 逃 ${pct("nige")}% / 先 ${pct("senko")}% / 差 ${pct("sashi")}% / 追 ${pct("oikomi")}%`);
  console.log(`スタミナ切れ: ${r.emptiedPerRace.toFixed(1)}頭/12  平均最低スタミナ: ${r.avgMinSta.toFixed(0)}`);
  console.log(`距離適性 1頭あたり勝率: ◎ ${r.aptGoodRate.toFixed(1)}% / × ${isNaN(r.aptBadRate)?"—":r.aptBadRate.toFixed(1)+"%"} (平均8.3%)`);
  const shares=ABK.map(k=>[k, r.abilities[k]/N*100]).sort((a,b)=>b[1]-a[1]);
  const warn=shares.filter(([k,v])=>v>13||v<4).map(([k,v])=>`${AB_JA[k]}${v.toFixed(1)}%`);
  console.log(`固有シェア最大: ${AB_JA[shares[0][0]]} ${shares[0][1].toFixed(1)}% / 最小: ${AB_JA[shares[shares.length-1][0]]} ${shares[shares.length-1][1].toFixed(1)}%${warn.length?`  ⚠ 要注意: ${warn.join(", ")}`:"  ✓"}`);
}
console.log("\n→ 上記が冒頭コメントの合格目安レンジ内なら回帰OK。外れたら原因のパラメータを戻すこと。");
