/**
 * スタミナ消費の調整実験ツール
 *   node sims/stamina_tune.js              → BASE [0.45, 0.34, 0.26] を比較
 *   node sims/stamina_tune.js 0.30 0.38    → 任意のBASE値を比較
 *
 * ■ 鉄則（2026-06 実証済み）
 *   ・緩めるのは BASE（基礎消費）のみ。
 *   ・COEF/FREE（速度依存項）や一律倍率DMを緩めると、逃げ先行が止まらなくなり
 *     差し・追込が壊滅する（BASE0.26以下も同様の兆候）。
 *   ・目標: 持久力を上げても 2000m で 差し+追込 ≥ 55% を維持すること。
 */
const { runMany } = require("./engine");
const bases = process.argv.slice(2).map(Number).filter(v=>!isNaN(v));
const list = bases.length? bases : [0.45, 0.34, 0.26];
const N = 900;
for(const BASE of list){
  console.log(`\n##### BASE=${BASE} #####`);
  for(const DIST of [1200,1600,2000]){
    const r=runMany(DIST,N,{BASE});
    const s=r.styles, pct=k=>(s[k]/N*100).toFixed(0);
    console.log(`${DIST}m: 時計${r.time.toFixed(1)}s | 逃${pct("nige")} 先${pct("senko")} 差${pct("sashi")} 追${pct("oikomi")} | 切れ${r.emptiedPerRace.toFixed(1)}頭 | 平均最低スタ${r.avgMinSta.toFixed(0)}`);
  }
}
